from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User, Province, District, Issue, Comment, Vote, Report


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'is_moderator', 'is_staff', 'date_joined']
    list_filter = ['is_moderator', 'is_staff', 'is_superuser']
    list_editable = ['is_moderator']
    search_fields = ['username', 'email']
    fieldsets = UserAdmin.fieldsets + (
        ('CivicPulse', {'fields': ('is_moderator', 'bio')}),
    )


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ['number', 'name']
    ordering = ['number']


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name', 'province']
    list_filter = ['province']
    search_fields = ['name']


def soft_delete_issues(modeladmin, request, queryset):
    queryset.update(is_deleted=True)
soft_delete_issues.short_description = "Soft-delete selected issues"


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'province', 'district', 'author', 'status', 'is_deleted', 'created_at']
    list_filter = ['category', 'status', 'province', 'is_deleted']
    list_editable = ['status']
    search_fields = ['title', 'description', 'author__username']
    actions = [soft_delete_issues]
    readonly_fields = ['created_at', 'updated_at']


def soft_delete_comments(modeladmin, request, queryset):
    queryset.update(is_deleted=True)
soft_delete_comments.short_description = "Soft-delete selected comments"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['issue', 'author', 'text_preview', 'is_deleted', 'created_at']
    list_filter = ['is_deleted']
    search_fields = ['text', 'author__username']
    actions = [soft_delete_comments]

    def text_preview(self, obj):
        return obj.text[:80] + ('...' if len(obj.text) > 80 else '')
    text_preview.short_description = 'Text'


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['issue', 'user', 'value']
    list_filter = ['value']


def mark_reports_resolved(modeladmin, request, queryset):
    queryset.update(resolved=True)
mark_reports_resolved.short_description = "Mark selected reports as resolved"


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['reporter', 'reason', 'target_link', 'resolved', 'created_at']
    list_filter = ['reason', 'resolved']
    list_editable = ['resolved']
    search_fields = ['reporter__username', 'note']
    actions = [mark_reports_resolved]

    def target_link(self, obj):
        if obj.issue:
            return format_html('<a href="/admin/core/issue/{}/change/">Issue #{}</a>', obj.issue_id, obj.issue_id)
        elif obj.comment:
            return format_html('<a href="/admin/core/comment/{}/change/">Comment #{}</a>', obj.comment_id, obj.comment_id)
        return '-'
    target_link.short_description = 'Target'
    target_link.allow_tags = True
