import requests
from .models import AISettings

class AIService:
    @staticmethod
    def get_response(user_message, session_id=None):
        settings = AISettings.objects.first()
        if not settings or not settings.is_enabled or not settings.api_key:
            return "Maaf, sistem AI sedang dinonaktifkan."

        messages = [
            {"role": "system", "content": settings.system_prompt}
        ]
        
        # Add Welcome Message and Category context if session_id is provided
        if session_id:
            from .models import ChatSession
            session = ChatSession.objects.filter(id=session_id).first()
            if session and session.category:
                context_prefix = f"Kategori: {session.category.name}. "
                if session.category.welcome_message:
                    context_prefix += f"Pesan perkenalan Anda: \"{session.category.welcome_message}\". "
                
                # Insert context before the actual prompt or into system prompt
                messages[0]["content"] += f"\n\nContext: {context_prefix}"

        messages.append({"role": "user", "content": user_message})

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.api_key}"
        }

        data = {
            "model": settings.model_name,
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0.7
        }

        try:
            response = requests.post(
                f"{settings.base_url}/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            return result['choices'][0]['message']['content']
        except Exception as e:
            print(f"AI Service Error: {e}")
            return "Maaf, terjadi kesalahan saat menghubungi asisten AI."
