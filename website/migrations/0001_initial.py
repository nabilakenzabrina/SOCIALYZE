# Generated for Socialyze migration to Django + MySQL.
from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='Consultation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reference', models.CharField(db_index=True, editable=False, max_length=20, unique=True)),
                ('name', models.CharField(max_length=120)),
                ('email', models.EmailField(max_length=254)),
                ('service', models.CharField(max_length=120)),
                ('budget', models.CharField(max_length=100)),
                ('brief', models.TextField()),
                ('status', models.CharField(choices=[('Menunggu ditinjau', 'Menunggu ditinjau'), ('Sedang ditindaklanjuti', 'Sedang ditindaklanjuti'), ('Selesai', 'Selesai')], default='Menunggu ditinjau', max_length=40)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reference', models.CharField(db_index=True, editable=False, max_length=20, unique=True)),
                ('name', models.CharField(max_length=120)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(max_length=40)),
                ('notes', models.TextField(blank=True)),
                ('payment_method', models.CharField(max_length=80)),
                ('items', models.JSONField(default=list)),
                ('total', models.PositiveBigIntegerField(default=0)),
                ('status', models.CharField(choices=[('Menunggu konfirmasi', 'Menunggu konfirmasi'), ('Sedang ditinjau', 'Sedang ditinjau'), ('Selesai', 'Selesai'), ('Dibatalkan', 'Dibatalkan')], default='Menunggu konfirmasi', max_length=40)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
