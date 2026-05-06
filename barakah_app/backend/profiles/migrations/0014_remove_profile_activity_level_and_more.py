from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0013_profile_activity_level_profile_age_fitness_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='profile',
            name='activity_level',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='age_fitness',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='daily_target',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='height',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='last_health_check',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='starting_weight',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='weight',
        ),
    ]
