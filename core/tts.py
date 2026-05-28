import asyncio
import edge_tts
import uuid
import os
import time
import logging
from asgiref.sync import async_to_sync
from django.conf import settings

# 1. Setup Logging
logger = logging.getLogger(__name__)

# 2. Use Django's settings for paths to ensure cross-environment compatibility
MEDIA_DIR = os.path.join(settings.MEDIA_ROOT, "tts")
os.makedirs(MEDIA_DIR, exist_ok=True)

VOICE = "en-US-AriaNeural"
MAX_RETRIES = 3

def cleanup_old_audio_files(max_age_hours=1):
    """
    Prevents the server's disk from filling up by deleting MP3s older than max_age_hours.
    """
    try:
        current_time = time.time()
        for filename in os.listdir(MEDIA_DIR):
            filepath = os.path.join(MEDIA_DIR, filename)
            
            # Check if it's a file and older than the threshold
            if os.path.isfile(filepath):
                file_age_seconds = current_time - os.path.getmtime(filepath)
                if file_age_seconds > (max_age_hours * 3600):
                    os.remove(filepath)
                    
    except Exception as e:
        logger.error(f"Background TTS cleanup failed: {e}")

async def _generate_voice_async(text):
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(MEDIA_DIR, filename)
    
    # 3. Implement Retry Logic for Network Failures
    for attempt in range(MAX_RETRIES):
        try:
            communicate = edge_tts.Communicate(text, VOICE)
            await communicate.save(filepath)
            
            # Use Django's MEDIA_URL dynamically instead of hardcoding
            return f"{settings.MEDIA_URL}tts/{filename}"
            
        except Exception as e:
            logger.warning(f"TTS Generation failed on attempt {attempt + 1}: {e}")
            if attempt == MAX_RETRIES - 1:
                logger.error("All TTS retries failed.")
                raise e # Surface the error to the view after all retries fail
            
            # Wait a moment before trying again
            await asyncio.sleep(1)

def generate_voice_sync(text):
    """
    Safely runs the async edge-tts code in a synchronous Django view.
    Includes a self-cleaning mechanism for storage.
    """
    # Trigger cleanup before generating new files
    cleanup_old_audio_files(max_age_hours=1)
    
    return async_to_sync(_generate_voice_async)(text)