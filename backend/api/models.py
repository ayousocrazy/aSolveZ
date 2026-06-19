from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model. Public identity is username only; email is private.
    is_moderator is ONLY set by superusers via Django admin or shell.
    ward links the citizen to their specific ward for localised filtering.
    """
    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True, default='')
    is_moderator = models.BooleanField(default=False)
    # Citizen's home ward — optional so ward admins / superusers don't need one
    ward = models.ForeignKey(
        'Ward', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='residents'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.username


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

    # Convenience properties used by serializers / analytics
    @property
    def district(self):
        return self.municipality.district

    @property
    def province(self):
        return self.municipality.district.province


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
        ('open', 'Open'),
        ('acknowledged', 'Acknowledged'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]

    title = models.CharField(max_length=200)
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
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='issues'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.category}] {self.title}"

    @property
    def vote_score(self):
        return self.votes.aggregate(total=models.Sum('value'))['total'] or 0

    @property
    def comment_count(self):
        return self.comments.filter(is_deleted=False).count()


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


class Report(models.Model):
    REASON_CHOICES = [
        ('spam', 'Spam'),
        ('hate', 'Hate Speech'),
        ('misinformation', 'Misinformation'),
        ('irrelevant', 'Irrelevant'),
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

    def __str__(self):
        target = f"Issue #{self.issue_id}" if self.issue else f"Comment #{self.comment_id}"
        return f"Report on {target} — {self.reason}"