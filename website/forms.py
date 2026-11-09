from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
from .models import UserProfile

User = get_user_model()


class RegisterForm(UserCreationForm):
    username = forms.CharField(
        max_length=150,
        required=True,
        label='Nama Pengguna',
        widget=forms.TextInput(attrs={
            'placeholder': 'Masukkan nama pengguna'
        })
    )

    email = forms.EmailField(
        required=True,
        label='Email',
        widget=forms.EmailInput(attrs={
            'placeholder': 'Masukkan email'
        })
    )

    password1 = forms.CharField(
        required=True,
        label='Kata Sandi',
        widget=forms.PasswordInput(attrs={
            'placeholder': 'Masukkan kata sandi'
        })
    )

    password2 = forms.CharField(
        required=True,
        label='Konfirmasi Kata Sandi',
        widget=forms.PasswordInput(attrs={
            'placeholder': 'Konfirmasi kata sandi'
        })
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')

    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError('Email sudah digunakan.')

        return email


class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email')
        labels = {
            'first_name': 'Nama depan',
            'last_name': 'Nama belakang',
            'email': 'Email'
        }


class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ('phone',)
        labels = {
            'phone': 'Nomor telepon / WhatsApp'
        }