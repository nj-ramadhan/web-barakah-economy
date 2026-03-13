from rest_framework import permissions

class IsAuthorOrAdminOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow authors of an object or admins to edit or delete it.
    Assumes the model instance has an `author` attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the author or an admin
        user = request.user
        if not user.is_authenticated:
            return False
            
        is_admin = getattr(user, 'role', '') == 'admin'
        is_author = obj.author == user
        
        return is_admin or is_author
