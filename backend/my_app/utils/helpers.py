# File: backend/my_app/utils/helpers.py
import re
from models import Frequency

def parse_frequency_and_duration(input_str: str) -> tuple[str | None, str | None]:
    if not input_str:
        return None, None
    match = re.match(r"(\w+)(?:\s*\((.*?)\))?", input_str.strip())
    if match:
        freq, duration = match.groups()
        if freq in [f.value for f in Frequency]:
            return freq, duration
    return input_str if input_str in [f.value for f in Frequency] else None, None
