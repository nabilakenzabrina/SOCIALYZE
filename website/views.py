
import json
import re
import html
import urllib.request
from urllib.parse import urlparse, urljoin

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse, HttpResponseBadRequest
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError, transaction
from django.utils.text import slugify
from django.utils import timezone

from .models import Order, Consultation, UserProfile, Article, ArticleCategory
from .forms import RegisterForm, ProfileForm, UserProfileForm



def staff_login(request):
    if request.user.is_authenticated and request.user.is_staff:
        return redirect('dashboard')

    error = ''

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)

        if user is not None and user.is_staff:
            login(request, user)
            return redirect('dashboard')

        error = 'Username atau password salah, atau akun bukan admin.'

    return render(request, 'registration/staff_login.html', {'error': error})


def staff_logout(request):
    if request.method == 'POST':
        logout(request)

    return redirect('home')


@staff_member_required(login_url='staff_login')
def dashboard(request):
    orders = Order.objects.all().order_by('-created_at')
    consultations = Consultation.objects.all().order_by('-created_at')

    # Menghitung total pendapatan
    total_revenue = sum(o.total for o in orders)

    # Format angka dengan pemisah ribuan Indonesia
    revenue_display = f"{total_revenue:,.0f}".replace(",", ".")

    # Format harga setiap pesanan
    for order in orders:
        order.total_display = f"{order.total:,.0f}".replace(",", ".")

    return render(request, 'website/admin.html', {
        'orders': orders,
        'consultations': consultations,
        'total_orders': orders.count(),
        'revenue': total_revenue,
        'revenue_display': revenue_display,
        'pending_orders': orders.filter(status='Menunggu konfirmasi').count(),
        'total_consultations': consultations.count(),
        'pending_consultations': consultations.filter(status='Menunggu ditinjau').count(),
    })

def json_body(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


@require_POST
def orders_api(request):
    data = json_body(request)

    if data is None:
        return HttpResponseBadRequest('JSON tidak valid.')

    required = ['name', 'email', 'phone', 'payment', 'items']

    if any(not data.get(key) for key in required):
        return JsonResponse({
            'error': 'Lengkapi nama, email, nomor WhatsApp, metode pembayaran, dan paket.'
        }, status=400)

    try:
        validate_email(str(data['email']).strip())
    except ValidationError:
        return JsonResponse({'error': 'Format email tidak valid.'}, status=400)

    if data['payment'] not in [
        'QRIS (demo)',
        'Virtual Account (demo)',
        'Transfer bank manual (demo)'
    ]:
        return JsonResponse({'error': 'Metode pembayaran tidak valid.'}, status=400)

    if not isinstance(data['items'], list) or not data['items']:
        return JsonResponse({
            'error': 'Keranjang pesanan kosong atau tidak valid.'
        }, status=400)

    # Prices are validated and calculated server-side.
    allowed = {
        'Paket Starter Branding': 700000,
        'Paket Silver Sosial Media': 1600000,
        'Paket Gold Digital Strategy': 2500000,
    }

    cleaned_items = []

    for item in data['items']:
        if not isinstance(item, dict) or item.get('name') not in allowed:
            return JsonResponse({
                'error': 'Ada paket yang tidak dikenal. Muat ulang halaman dan coba lagi.'
            }, status=400)

        name = item['name']
        cleaned_items.append({
            'name': name,
            'price': allowed[name]
        })

    total = sum(item['price'] for item in cleaned_items)

    order = Order.objects.create(
        name=str(data['name']).strip()[:120],
        email=str(data['email']).strip(),
        phone=str(data['phone']).strip()[:40],
        notes=str(data.get('notes', '')).strip(),
        payment_method=str(data['payment']).strip()[:80],
        items=cleaned_items,
        total=total,
    )

    return JsonResponse({
        'id': order.reference,
        'name': order.name,
        'status': order.status
    }, status=201)


@staff_member_required(login_url='staff_login')
@require_GET
def orders_list_api(request):
    return JsonResponse({
        'orders': [
            order_to_dict(o)
            for o in Order.objects.all().order_by('-created_at')
        ]
    })


def order_to_dict(o):
    return {
        'id': o.id,
        'reference': o.reference,
        'date': o.created_at.isoformat(),
        'name': o.name,
        'email': o.email,
        'phone': o.phone,
        'notes': o.notes,
        'payment': o.payment_method,
        'items': o.items,
        'total': o.total,
        'status': o.status
    }


@staff_member_required(login_url='staff_login')
@require_http_methods(['PATCH', 'DELETE'])
def order_detail_api(request, order_id):
    order = get_object_or_404(Order, pk=order_id)

    if request.method == 'DELETE':
        order.delete()
        return JsonResponse({'ok': True})

    data = json_body(request)

    if not data or data.get('status') not in dict(Order.STATUS_CHOICES):
        return JsonResponse({'error': 'Status tidak valid.'}, status=400)

    order.status = data['status']
    order.save(update_fields=['status'])

    return JsonResponse({'ok': True, 'status': order.status})


@require_POST
def submit_consultation(request):
    data = json_body(request)

    if data is None:
        return HttpResponseBadRequest('JSON tidak valid.')

    required = ['name', 'email', 'service', 'budget', 'brief']

    if any(not str(data.get(key, '')).strip() for key in required):
        return JsonResponse({
            'error': 'Semua data konsultasi wajib diisi.'
        }, status=400)

    try:
        validate_email(str(data['email']).strip())
    except ValidationError:
        return JsonResponse({'error': 'Format email tidak valid.'}, status=400)

    if len(str(data['brief']).strip()) < 10:
        return JsonResponse({'error': 'Brief minimal 10 karakter.'}, status=400)

    consultation = Consultation.objects.create(
        name=str(data['name']).strip()[:120],
        email=str(data['email']).strip(),
        service=str(data['service']).strip()[:120],
        budget=str(data['budget']).strip()[:100],
        brief=str(data['brief']).strip(),
    )

    return JsonResponse({
        'id': consultation.reference,
        'name': consultation.name,
        'status': consultation.status
    }, status=201)


@staff_member_required(login_url='staff_login')
@require_GET
def consultations_api(request):
    return JsonResponse({
        'consultations': [
            {
                'id': c.id,
                'reference': c.reference,
                'date': c.created_at.isoformat(),
                'name': c.name,
                'email': c.email,
                'service': c.service,
                'budget': c.budget,
                'brief': c.brief,
                'status': c.status
            }
            for c in Consultation.objects.all().order_by('-created_at')
        ]
    })


@staff_member_required(login_url='staff_login')
@require_POST
def update_order_status(request, order_id):
    order = get_object_or_404(Order, pk=order_id)
    status = request.POST.get('status')

    if status in dict(Order.STATUS_CHOICES):
        order.status = status
        order.save(update_fields=['status'])
        messages.success(request, f'Status pesanan {order.reference} diperbarui.')
    else:
        messages.error(request, 'Status pesanan tidak valid.')

    return redirect('dashboard')


@staff_member_required(login_url='staff_login')
@require_POST
def delete_order(request, order_id):
    order = get_object_or_404(Order, pk=order_id)
    reference = order.reference
    order.delete()

    messages.success(request, f'Pesanan {reference} dihapus.')

    return redirect('dashboard')


def register(request):
    if request.user.is_authenticated:
        return redirect('user_dashboard')

    form = RegisterForm(request.POST or None)

    if request.method == 'POST' and form.is_valid():
        user = form.save()
        UserProfile.objects.get_or_create(user=user)
        login(request, user)

        messages.success(request, 'Akun berhasil dibuat. Selamat datang di Socialyze!')

        return redirect('user_dashboard')

    return render(request, 'website/register.html', {'form': form})


def user_login(request):
    if request.user.is_authenticated:
        return redirect('dashboard' if request.user.is_staff else 'user_dashboard')

    error = ''

    if request.method == 'POST':
        user = authenticate(
            request,
            username=request.POST.get('username', '').strip(),
            password=request.POST.get('password', '')
        )

        if user is not None:
            login(request, user)
            return redirect('dashboard' if user.is_staff else 'user_dashboard')

        error = 'Username atau password salah.'

    return render(request, 'website/login.html', {'error': error})


@login_required
@require_http_methods(['GET', 'POST'])
def user_dashboard(request):
    if request.user.is_staff:
        return redirect('dashboard')

    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        user_form = ProfileForm(request.POST, instance=request.user)
        profile_form = UserProfileForm(request.POST, instance=profile)

        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()

            messages.success(request, 'Profil berhasil diperbarui.')

            return redirect('user_dashboard')

    else:
        user_form = ProfileForm(instance=request.user)
        profile_form = UserProfileForm(instance=profile)

    orders = (
        Order.objects.filter(email__iexact=request.user.email).order_by('-created_at')
        if request.user.email else Order.objects.none()
    )

    return render(request, 'website/user_dashboard.html', {
        'user_form': user_form,
        'profile_form': profile_form,
        'orders': orders
    })


@login_required
@require_http_methods(['GET', 'POST'])
def admin_profile(request):
    if not request.user.is_staff:
        return redirect('user_dashboard')

    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        user_form = ProfileForm(request.POST, instance=request.user)
        profile_form = UserProfileForm(request.POST, instance=profile)

        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()

            messages.success(request, 'Profil admin berhasil diperbarui.')

            return redirect('admin_profile')

    else:
        user_form = ProfileForm(instance=request.user)
        profile_form = UserProfileForm(instance=profile)

    return render(request, 'website/profile.html', {
        'user_form': user_form,
        'profile_form': profile_form,
        'heading': 'Perbarui Profil Admin',
        'back_url': 'dashboard'
    })


# ==========================================
# ARTICLE METADATA
# ==========================================

def get_article_metadata(url):
    parsed = urlparse(url)

    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        raise ValueError('URL artikel tidak valid.')

    request = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0'}
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        content_type = response.headers.get('Content-Type', '')

        if 'text/html' not in content_type:
            raise ValueError('Link bukan halaman artikel HTML.')

        page = response.read(1000000).decode('utf-8', errors='ignore')
        page_url = response.geturl()

    def get_meta(name):
        patterns = [
            rf'<meta[^>]+(?:property|name)=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']*)',
            rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\']{re.escape(name)}["\']'
        ]

        for pattern in patterns:
            match = re.search(pattern, page, re.IGNORECASE)

            if match:
                return html.unescape(match.group(1).strip())

        return ''

    title = get_meta('og:title') or get_meta('twitter:title')
    excerpt = get_meta('og:description') or get_meta('description')
    image = get_meta('og:image') or get_meta('twitter:image')

    if not title:
        match = re.search(r'<title[^>]*>(.*?)</title>', page, re.I | re.S)
        title = html.unescape(match.group(1).strip()) if match else ''

    if not title:
        raise ValueError('Judul artikel tidak ditemukan.')

    return {
        'title': title[:180],
        'excerpt': excerpt[:300] or title[:300],
        'image': urljoin(page_url, image) if image else '',
    }


# ==========================================
# ADMIN ARTICLES
# ==========================================

@staff_member_required(login_url='staff_login')
def admin_articles(request):
    if request.method == 'POST':
        url = request.POST.get('source_url', '').strip()

        if not url:
            messages.error(request, 'Masukkan link artikel terlebih dahulu.')
            return redirect('admin_articles')

        try:
            metadata = get_article_metadata(url)

            slug = slugify(metadata['title']) or 'artikel'

            if Article.objects.filter(slug=slug).exists():
                slug = f"{slug}-{timezone.now().strftime('%Y%m%d%H%M%S')}"

            now = timezone.now()

            Article.objects.create(
                title=metadata['title'],
                slug=slug,
                excerpt=metadata['excerpt'],
                body=metadata['excerpt'],
                image=metadata['image'] or None,
                source_url=url,
                status='published',
                created_at=now,
                updated_at=now,
            )

            messages.success(request, 'Artikel berhasil ditambahkan!')

        except Exception as e:
            messages.error(request, f'Gagal mengambil artikel: {e}')

        return redirect('admin_articles')

    articles = Article.objects.all().order_by('-created_at')
    categories = ArticleCategory.objects.all()

    return render(request, 'website/admin_articles.html', {
        'articles': articles,
        'total_articles': articles.count(),
        'categories': categories,
    })


@staff_member_required(login_url='staff_login')
@require_POST
def admin_article_delete(request, article_id):
    article = get_object_or_404(Article, id=article_id)

    article.delete()

    messages.success(request, 'Artikel berhasil dihapus!')
    return redirect('admin_articles')


def public_articles(request):
    articles = Article.objects.filter(
        status='published'
    ).order_by('-created_at')

    return render(request, 'website/articles.html', {
        'articles': articles,
    })
@ensure_csrf_cookie
def home(request):
    articles = (
        Article.objects
        .filter(status='published')
        .select_related('category')
        .order_by('-created_at')[:3]
    )
    return render(request, 'website/index.html', {
        'articles': articles,
    })