import logging
from functools import wraps
from time import time

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def log_execution_time(func):
    """Decorator to log function execution time"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time()
        result = func(*args, **kwargs)
        end = time()
        logger.info(f"{func.__name__} executed in {end - start:.2f}s")
        return result
    return wrapper

def log_request_details(request):
    """Log request details for debugging"""
    logger.debug(f"Method: {request.method}")
    logger.debug(f"URL: {request.url}")
    logger.debug(f"Headers: {dict(request.headers)}")
    logger.debug(f"Client: {request.client.host}")