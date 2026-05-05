"""
Tool Registry — describes all callable functions the Global Agent can select.
Each tool has metadata used by the LLM planner to choose the right tool.
"""
from __future__ import annotations
from pydantic import BaseModel


class ToolParam(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True


class ToolInfo(BaseModel):
    name: str
    description: str
    when_to_use: str
    parameters: list[ToolParam]
    success_rate: float = 1.0


_INITIAL_TOOLS: list[ToolInfo] = [
    ToolInfo(
        name="generate_code",
        description="Generate code using the LLM",
        when_to_use="When the task requires writing any kind of code or script",
        parameters=[
            ToolParam(name="language", type="string", description="Programming language"),
            ToolParam(name="requirements", type="string", description="What the code must do"),
        ],
    ),
    ToolInfo(
        name="write_file",
        description="Write content to a file on disk",
        when_to_use="When output must be saved to the filesystem",
        parameters=[
            ToolParam(name="filename", type="string", description="Target file path"),
            ToolParam(name="content", type="string", description="Content to write"),
        ],
    ),
    ToolInfo(
        name="read_file",
        description="Read the content of a file from disk",
        when_to_use="When you need to access existing file contents",
        parameters=[
            ToolParam(name="filename", type="string", description="File path to read"),
        ],
    ),
    ToolInfo(
        name="analyze_text",
        description="Analyze, summarize, or extract information from text using the LLM",
        when_to_use="When you need to understand or process text content",
        parameters=[
            ToolParam(name="text", type="string", description="Text to analyze"),
            ToolParam(name="instruction", type="string", description="What to do with the text"),
        ],
    ),
    ToolInfo(
        name="call_agent",
        description="Send a task to a specific worker agent for execution",
        when_to_use="When you need a specialized or remote agent to handle a subtask",
        parameters=[
            ToolParam(name="agent_id", type="string", description="Target agent ID"),
            ToolParam(name="prompt", type="string", description="Task prompt for the agent"),
        ],
    ),
    ToolInfo(
        name="validate_output",
        description="Validate that a task output meets the required criteria",
        when_to_use="When you need to verify correctness or quality of a previous task result",
        parameters=[
            ToolParam(name="output", type="string", description="Output to validate"),
            ToolParam(name="criteria", type="string", description="Validation criteria"),
        ],
    ),
]


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolInfo] = {t.name: t for t in _INITIAL_TOOLS}

    def list_tools(self) -> list[ToolInfo]:
        return list(self._tools.values())

    def get(self, name: str) -> ToolInfo | None:
        return self._tools.get(name)

    def update_success_rate(self, name: str, success: bool) -> None:
        tool = self._tools.get(name)
        if not tool:
            return
        alpha = 0.1
        tool.success_rate = (1 - alpha) * tool.success_rate + alpha * (1.0 if success else 0.0)

    def to_prompt_text(self) -> str:
        lines = []
        for t in self._tools.values():
            params = ", ".join(f"{p.name}: {p.type}" for p in t.parameters)
            lines.append(f"- {t.name}({params}): {t.description}. Use when: {t.when_to_use}")
        return "\n".join(lines)


tool_registry = ToolRegistry()
