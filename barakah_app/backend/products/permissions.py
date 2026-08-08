from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins/staff to edit it.
    Assumes the model instance has a `seller` attribute.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin':
            return True

        return hasattr(obj, 'seller') and obj.seller == user
