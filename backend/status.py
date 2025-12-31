"""Status tracking for long-running operations."""

from typing import Optional
from dataclasses import dataclass
from enum import Enum


class StatusState(str, Enum):
    IDLE = "idle"
    LOADING = "loading"
    SAVING = "saving"
    COMPUTING = "computing"
    ERROR = "error"


@dataclass
class Status:
    state: StatusState
    message: Optional[str] = None


class StatusTracker:
    """Singleton tracker for operation status."""

    def __init__(self):
        self._status = Status(state=StatusState.IDLE)

    def set_status(self, state: str, message: Optional[str] = None):
        """Update current status."""
        self._status = Status(state=StatusState(state), message=message)

    def get_status(self) -> dict:
        """Get current status as dict."""
        return {
            "state": self._status.state.value,
            "message": self._status.message,
        }

    def clear(self):
        """Reset to idle state."""
        self._status = Status(state=StatusState.IDLE)


# Singleton instance
_status_tracker: Optional[StatusTracker] = None


def get_status_tracker() -> StatusTracker:
    """Get the singleton StatusTracker instance."""
    global _status_tracker
    if _status_tracker is None:
        _status_tracker = StatusTracker()
    return _status_tracker
