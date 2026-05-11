from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to edit it.
    Assumes the model instance has a `seller` attribute.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # but queryset filtering is handled in the view's get_queryset.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner or superuser.
        return obj.seller == request.user or request.user.is_superuser
