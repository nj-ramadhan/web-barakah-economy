import requests
from .models import AISettings

class AIService:
    @staticmethod
    def get_response(user_message, session_id=None):
        settings = AISettings.objects.first()
        if not settings or not settings.is_enabled or not settings.api_key:
            return "Maaf, sistem AI sedang dinonaktifkan."

        # Prepare system content for the AI
        system_content = f"You are a helpful assistant for Barakah Economy. "
        if settings.system_prompt:
            system_content = settings.system_prompt
        
        category = None
        # Add Welcome Message and Category context if session_id is provided
        if session_id:
            from .models import ChatSession
            session = ChatSession.objects.filter(id=session_id).first()
            if session and session.category:
                category = session.category
        
        # Add category context if available
        if category:
            # If category has its own AI system prompt, it overrides everything else
            if category.ai_system_prompt:
                system_content = category.ai_system_prompt
            else:
                # Otherwise, append category specific context
                system_content += f"\n\nContext Kategori: {category.name}"
                if category.welcome_message:
                    system_content += f"\nTemplate Sapaan: {category.welcome_message}"
            
            # Grounding with Knowledge Base (Materi/Module)
            if category.knowledge_base:
                system_content += f"\n\nMATERI/MODUL REFERENSI (Grounding):\n{category.knowledge_base}\n\nInstruksi: Gunakan materi di atas sebagai referensi utama dalam menjawab pertanyaan user agar jawaban tidak melenceng dari kurikulum/materi kategori ini."

        messages = [
            {"role": "system", "content": system_content}
        ]

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
            base_url = settings.base_url.rstrip('/')
            response = requests.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            return result['choices'][0]['message']['content']
        except requests.exceptions.HTTPError as e:
            print(f"AI API HTTP Error: {e.response.status_code} - {e.response.text}")
            return "Maaf, asisten AI sedang mengalami gangguan koneksi ke provider."
        except Exception as e:
            print(f"AI Service General Error: {e}")
            return "Maaf, terjadi kesalahan teknis pada sistem AI kami."
