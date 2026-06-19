from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsModeratorOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_moderator


class IsAuthorOrModerator(BasePermission):
    """Allow author or moderator to modify; others read-only."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        author = getattr(obj, 'author', None)
        return author == request.user or request.user.is_moderator
