from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import FileExtensionValidator


# ---------------------------------------------------------------------------
# Custom manager — phone is the login credential, not email or username
# ---------------------------------------------------------------------------

class UserManager(BaseUserManager):

    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError("Phone number is required")

        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('is_moderator', False)

        user = self.model(
            phone=phone,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, phone, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(
                'Superuser must have is_staff=True.'
            )

        if extra_fields.get('is_superuser') is not True:
            raise ValueError(
                'Superuser must have is_superuser=True.'
            )

        return self.create_user(
            phone,
            password,
            **extra_fields
        )

# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(AbstractUser):
    """
    Custom user model.
    - Citizens log in with phone + password.
    - Ward accounts are pre-seeded (is_staff=True, is_superuser=False).
      Their username follows the pattern: <district>-<municipality>-ward<number>
      e.g.  kathmandu-kathmandu_metropolitan-ward1
    - Superusers (is_superuser=True) access the Django admin panel only.
    - Ward accounts (is_staff=True, is_superuser=False) use the custom ward panel only.
    """

    # Remove username as a required / login field; keep it for ward account identifiers
    username = models.CharField(
        max_length=150,
        unique=True,
        blank=True,
        null=True,
        help_text="Auto-generated for ward accounts. Leave blank for citizens.",
    )

    # Primary identity for citizens
    name = models.CharField(
        max_length=150,
        blank=True,
        default=''
    )
    phone = models.CharField(max_length=20, unique=True)

    # Email is optional
    email = models.EmailField(blank=True, default='')

    # Profile picture (optional for citizens, unused for ward accounts)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', blank=True, null=True
    )

    # Moderator flag — set only by superusers
    is_moderator = models.BooleanField(default=False)

    # Ward link — set for ward accounts; optional for citizens
    ward = models.ForeignKey(
        'Ward', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='residents'
    )

    objects = UserManager()

    USERNAME_FIELD = 'phone'
    # These are prompted when using createsuperuser; username/email not required
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        if self.username:
            return self.username          # ward account
        return f"{self.name} ({self.phone})"

    @property
    def is_ward_account(self):
        """True for pre-seeded ward office accounts."""
        return self.is_staff and not self.is_superuser


# ---------------------------------------------------------------------------
# Geography
# ---------------------------------------------------------------------------

class Province(models.Model):
    name = models.CharField(max_length=100, unique=True)
    number = models.PositiveSmallIntegerField(unique=True)

    class Meta:
        ordering = ['number']

    def __str__(self):
        return f"Province No. {self.number} — {self.name}"


class District(models.Model):
    name = models.CharField(max_length=100)
    province = models.ForeignKey(
        Province, on_delete=models.CASCADE, related_name='districts'
    )

    class Meta:
        ordering = ['name']
        unique_together = [('name', 'province')]

    def __str__(self):
        return f"{self.name} ({self.province.name})"


class Municipality(models.Model):
    """
    Represents a local government unit inside a district.
    type distinguishes Metro / Sub-metro / Municipality / Rural Municipality
    (Gaun Palika) as per Nepal's federal structure.
    ward_count reflects the officially gazetted number of wards;
    actual Ward rows are generated from this during seeding.
    """
    TYPE_CHOICES = [
        ('metropolitan', 'Metropolitan City'),
        ('sub_metropolitan', 'Sub-Metropolitan City'),
        ('municipality', 'Municipality'),
        ('rural', 'Rural Municipality (Gaun Palika)'),
    ]

    name = models.CharField(max_length=150)
    district = models.ForeignKey(
        District, on_delete=models.CASCADE, related_name='municipalities'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='municipality')
    ward_count = models.PositiveSmallIntegerField(
        help_text="Official number of wards in this local government unit."
    )

    class Meta:
        ordering = ['name']
        unique_together = [('name', 'district')]
        verbose_name_plural = 'Municipalities'

    def __str__(self):
        return f"{self.name} ({self.get_type_display()}) — {self.district.name}"


class Ward(models.Model):
    """
    A single numbered ward within a municipality.
    Wards are the smallest administrative unit and the primary scope
    for WardConnect complaints and governance actions.

    Each Ward has exactly one pre-seeded ward account (User with is_staff=True).
    """
    municipality = models.ForeignKey(
        Municipality, on_delete=models.CASCADE, related_name='wards'
    )
    number = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ['municipality', 'number']
        unique_together = [('municipality', 'number')]

    def __str__(self):
        return f"Ward {self.number} — {self.municipality.name}"

    @property
    def district(self):
        return self.municipality.district

    @property
    def province(self):
        return self.municipality.district.province

    @property
    def ward_account_username(self):
        """
        Deterministic username for this ward's pre-seeded account.
        Format: <district_slug>-<municipality_slug>-ward<number>
        """
        import re
        def slugify(s):
            return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')

        district_slug = slugify(self.municipality.district.name)
        muni_slug = slugify(self.municipality.name)
        return f"{district_slug}-{muni_slug}-ward{self.number}"


# ---------------------------------------------------------------------------
# Issue
# ---------------------------------------------------------------------------

class Issue(models.Model):
    CATEGORY_CHOICES = [
        ('road', 'Road'),
        ('water', 'Water'),
        ('electricity', 'Electricity'),
        ('corruption', 'Corruption'),
        ('health', 'Health'),
        ('education', 'Education'),
        ('garbage', 'Garbage'),
        ('safety', 'Safety'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('acknowledged', 'Acknowledged'),
        ('completed', 'Completed'),
    ]

    # No title — issues are identified by category + description + location
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')

    province = models.ForeignKey(Province, on_delete=models.PROTECT, related_name='issues')
    district = models.ForeignKey(District, on_delete=models.PROTECT, related_name='issues')
    municipality = models.ForeignKey(
        Municipality, on_delete=models.PROTECT, related_name='issues',
        null=True, blank=True
    )
    ward = models.ForeignKey(
        Ward, on_delete=models.PROTECT, related_name='issues',
        null=True, blank=True
    )
    locality = models.CharField(max_length=200, blank=True, default='')

    # Citizen who submitted
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='issues'
    )

    # Optional media evidence from citizen
    image = models.ImageField(upload_to='issue_images/', blank=True, null=True)
    video = models.FileField(
        upload_to='issue_videos/',
        validators=[
            FileExtensionValidator(
                allowed_extensions=[
                    'mp4',
                    'mov',
                    'avi',
                    'webm'
                ]
            )
        ],
        blank=True,
        null=True
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # When a ward marks an issue completed they must provide resolution evidence
    resolution_note = models.TextField(blank=True, default='')
    resolution_image = models.ImageField(upload_to='resolution_images/', blank=True, null=True)
    resolution_video = models.FileField(
        upload_to='resolution_videos/',
        validators=[
            FileExtensionValidator(
                allowed_extensions=[
                    'mp4',
                    'mov',
                    'avi',
                    'webm'
                ]
            )
        ],
        blank=True,
        null=True
    )

    # Soft delete
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.category}] Issue #{self.pk} — Ward {self.ward}"

    @property
    def vote_score(self):
        return self.votes.aggregate(total=models.Sum('value'))['total'] or 0

    @property
    def comment_count(self):
        return self.comments.filter(is_deleted=False).count()


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------

class Comment(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='comments'
    )
    text = models.TextField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on Issue #{self.issue_id}"


# ---------------------------------------------------------------------------
# Vote  (upvote / downvote on issues)
# ---------------------------------------------------------------------------

class Vote(models.Model):
    VALUE_CHOICES = [(1, 'Upvote'), (-1, 'Downvote')]

    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes')
    value = models.SmallIntegerField(choices=VALUE_CHOICES)

    class Meta:
        unique_together = [('issue', 'user')]

    def __str__(self):
        sign = '+' if self.value > 0 else ''
        return f"{sign}{self.value} by {self.user} on Issue #{self.issue_id}"


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
# Reports serve two purposes:
#   1. Standard moderation (spam, hate speech, etc.)
#   2. Re-flagging a completed issue the citizen believes was falsely resolved.
#      In this case reason='false_resolution' and the related issue is linked.
#
# The ward admin reviews all reports against their ward's issues/comments.
# ---------------------------------------------------------------------------

class Report(models.Model):
    REASON_CHOICES = [
        ('spam', 'Spam'),
        ('hate', 'Hate Speech'),
        ('misinformation', 'Misinformation'),
        ('irrelevant', 'Irrelevant'),
        ('false_resolution', 'False Resolution'),   # citizen re-flags a completed issue
        ('other', 'Other'),
    ]

    issue = models.ForeignKey(
        Issue, on_delete=models.CASCADE, related_name='reports', null=True, blank=True
    )
    comment = models.ForeignKey(
        Comment, on_delete=models.CASCADE, related_name='reports', null=True, blank=True
    )
    reporter = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='reports_filed'
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    note = models.TextField(blank=True, default='')
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.issue and not self.comment:
            raise ValidationError("A report must target an issue or a comment.")
        if self.issue and self.comment:
            raise ValidationError("A report cannot target both an issue and a comment.")
        # false_resolution only makes sense on a completed issue
        if self.reason == 'false_resolution':
            if not self.issue:
                raise ValidationError("false_resolution reports must target an issue.")
            if self.issue.status != 'completed':
                raise ValidationError(
                    "You can only re-flag an issue that has been marked as completed."
                )

    def __str__(self):
        target = f"Issue #{self.issue_id}" if self.issue else f"Comment #{self.comment_id}"
        return f"Report on {target} — {self.reason}"


# ---------------------------------------------------------------------------
# Ward Action / Announcement
# ---------------------------------------------------------------------------
# Ward offices can publish positive development posts and announcements.
# These appear in citizens' ward action feed.
# ---------------------------------------------------------------------------

class WardPost(models.Model):
    POST_TYPE_CHOICES = [
        ('announcement', 'Announcement'),
        ('project', 'Completed Project'),
        ('event', 'Community Event'),
        ('update', 'General Update'),
    ]

    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='ward_posts'
    )
    post_type = models.CharField(max_length=20, choices=POST_TYPE_CHOICES, default='update')
    title = models.CharField(max_length=200)
    body = models.TextField()
    image = models.ImageField(upload_to='ward_post_images/', blank=True, null=True)
    video = models.FileField(
        upload_to='ward_post_videos/',
        validators=[
            FileExtensionValidator(
                allowed_extensions=[
                    'mp4',
                    'mov',
                    'avi',
                    'webm'
                ]
            )
        ],
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.post_type}] {self.title} — Ward {self.ward}"