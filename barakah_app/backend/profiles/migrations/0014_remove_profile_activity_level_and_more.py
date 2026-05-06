from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0013_profile_activity_level_profile_age_fitness_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
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
            ],
            database_operations=[
                # We use SQL that ignores if the column is already missing to avoid migration failure
                migrations.RunSQL("ALTER TABLE profiles_profile DROP COLUMN IF EXISTS activity_level;"),
                migrations.RunSQL("ALTER TABLE profiles_profile DROP COLUMN IF EXISTS age_fitness;"),
                migrations.RunSQL("ALTER TABLE profiles_profile DROP COLUMN IF EXISTS daily_target;"),
                migrations.RunSQL("ALTER TABLE profiles_profile DROP COLUMN IF EXISTS height;"),
                migrations.RunSQL("ALTER TABLE profiles_profile DROP COLUMN IF EXISTS last_health_check;"),
                migrations.RunSQL("ALTER TABLE profiles_profile DROP COLUMN IF EXISTS starting_weight;"),
                migrations.RunSQL("ALTER TABLE profiles_profile DROP COLUMN IF EXISTS weight;"),
            ]
        )
    ]
