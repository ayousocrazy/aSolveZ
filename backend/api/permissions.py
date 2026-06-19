from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsModeratorOrReadOnly(BasePermission):

    def has_permission(self, request, view):

        if request.method in SAFE_METHODS:
            return True

        return (
            request.user.is_authenticated
            and request.user.is_moderator
        )


class IsAuthorOrModerator(BasePermission):

    def has_object_permission(self, request, view, obj):

        if request.method in SAFE_METHODS:
            return True

        if not request.user.is_authenticated:
            return False

        return (
            obj.author == request.user
            or request.user.is_moderator
        )


class IsWardAccount(BasePermission):

    message = (
        "Only ward office accounts can perform this action."
    )

    def has_permission(self, request, view):

        return (
            request.user.is_authenticated
            and request.user.is_ward_account
        )


class IsWardAccountForIssue(BasePermission):

    message = (
        "You can only manage issues within your own ward."
    )

    def has_object_permission(self, request, view, obj):

        if request.method in SAFE_METHODS:
            return True

        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        return (
            request.user.is_ward_account
            and obj.ward == request.user.ward
        )

class IsWardAccountForPost(BasePermission):

    def has_object_permission(self, request, view, obj):

        if request.method in SAFE_METHODS:
            return True

        if not request.user.is_authenticated:
            return False

        return obj.ward == request.user.ward