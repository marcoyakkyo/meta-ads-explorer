import os
from dotenv import load_dotenv

load_dotenv(override=True)

IS_DEBUG = os.getenv("DEBUG", "").lower() == "true"
