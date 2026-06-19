from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User, Province, District, Municipality, Ward,
    Issue, Comment, Vote, Report, WardPost,
)


# ---------------------------------------------------------------------------
# User admin
# ---------------------------------------------------------------------------

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    list_display = [
        'phone', 'name', 'is_ward_account_display',
        'is_moderator', 'is_staff', 'date_joined',
    ]
    list_filter = ['is_moderator', 'is_staff', 'is_superuser']
    list_editable = ['is_moderator']
    search_fields = ['phone', 'name', 'username']

    # Override fieldsets — phone replaces username as the login field
    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        ('Personal info', {'fields': ('name', 'email', 'profile_picture')}),
        ('Ward link', {'fields': ('ward', 'username')}),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'is_moderator', 'groups', 'user_permissions',
            )
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone', 'name', 'password1', 'password2', 'ward', 'is_staff'),
        }),
    )
    readonly_fields = ['date_joined', 'last_login']
    ordering = ['phone']

    @admin.display(boolean=True, description='Ward Account')
    def is_ward_account_display(self, obj):
        return obj.is_staff and not obj.is_superuser


# ---------------------------------------------------------------------------
# Geography
# ---------------------------------------------------------------------------

@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ['number', 'name']
    ordering = ['number']


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name', 'province']
    list_filter = ['province']
    search_fields = ['name']


@admin.register(Municipality)
class MunicipalityAdmin(admin.ModelAdmin):
    list_display = ['name', 'district', 'type', 'ward_count']
    list_filter = ['type', 'district__province']
    search_fields = ['name']


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ['number', 'municipality', 'ward_account_username_display']
    list_filter = ['municipality__district__province']
    search_fields = ['municipality__name']

    @admin.display(description='Ward Account Username')
    def ward_account_username_display(self, obj):
        return obj.ward_account_username


# ---------------------------------------------------------------------------
# Issues
# ---------------------------------------------------------------------------

def soft_delete_issues(modeladmin, request, queryset):
    queryset.update(is_deleted=True)
soft_delete_issues.short_description = "Soft-delete selected issues"


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'category', 'ward', 'author',
        'status', 'vote_score_display', 'is_deleted', 'created_at',
    ]
    list_filter = ['category', 'status', 'province', 'is_deleted']
    list_editable = ['status']
    search_fields = ['description', 'author__name', 'author__phone']
    actions = [soft_delete_issues]
    readonly_fields = ['created_at', 'updated_at']

    @admin.display(description='Votes')
    def vote_score_display(self, obj):
        return obj.vote_score


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def soft_delete_comments(modeladmin, request, queryset):
    queryset.update(is_deleted=True)
soft_delete_comments.short_description = "Soft-delete selected comments"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['issue', 'author', 'text_preview', 'is_deleted', 'created_at']
    list_filter = ['is_deleted']
    search_fields = ['text', 'author__name', 'author__phone']
    actions = [soft_delete_comments]

    def text_preview(self, obj):
        return obj.text[:80] + ('...' if len(obj.text) > 80 else '')
    text_preview.short_description = 'Text'


# ---------------------------------------------------------------------------
# Votes
# ---------------------------------------------------------------------------

@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['issue', 'user', 'value']
    list_filter = ['value']


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

def mark_reports_resolved(modeladmin, request, queryset):
    queryset.update(resolved=True)
mark_reports_resolved.short_description = "Mark selected reports as resolved"


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['reporter', 'reason', 'target_link', 'resolved', 'created_at']
    list_filter = ['reason', 'resolved']
    list_editable = ['resolved']
    search_fields = ['reporter__name', 'reporter__phone', 'note']
    actions = [mark_reports_resolved]

    def target_link(self, obj):
        if obj.issue:
            return format_html(
                '<a href="/admin/api/issue/{}/change/">Issue #{}</a>',
                obj.issue_id, obj.issue_id
            )
        elif obj.comment:
            return format_html(
                '<a href="/admin/api/comment/{}/change/">Comment #{}</a>',
                obj.comment_id, obj.comment_id
            )
        return '-'
    target_link.short_description = 'Target'
    target_link.allow_tags = True


# ---------------------------------------------------------------------------
# Ward Posts
# ---------------------------------------------------------------------------

@admin.register(WardPost)
class WardPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'ward', 'post_type', 'created_at']
    list_filter = ['post_type', 'ward__municipality__district__province']
    search_fields = ['title', 'body']