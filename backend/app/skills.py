import re


SKILL_ALIASES: dict[str, tuple[str, ...]] = {
    "javascript": ("javascript", "js", "ecmascript"),
    "typescript": ("typescript", "ts"),
    "python": ("python", "py"),
    "postgresql": ("postgresql", "postgres", "pgsql"),
    "microsoft excel": ("microsoft excel", "excel", "ms excel"),
    "react": ("react", "react.js", "reactjs"),
    "react native": ("react native", "react-native"),
    "node.js": ("node.js", "nodejs", "node"),
    "fastapi": ("fastapi", "fast api"),
    "machine learning": ("machine learning", "ml"),
    "artificial intelligence": ("artificial intelligence", "ai"),
    "amazon web services": ("amazon web services", "aws"),
    "customer service": ("customer service", "customer support", "client service"),
}

_ALIAS_TO_CANONICAL = {
    re.sub(r"[^a-z0-9]+", "", alias.casefold()): canonical
    for canonical, aliases in SKILL_ALIASES.items()
    for alias in aliases
}

# These are related concepts, not interchangeable aliases. They can influence
# ranking but can never satisfy a mandatory eligibility criterion.
RELATED_SKILL_GROUPS: tuple[frozenset[str], ...] = (
    frozenset({"javascript", "typescript", "react", "react native", "node.js"}),
    frozenset({"python", "fastapi", "machine learning", "artificial intelligence"}),
    frozenset({"postgresql", "microsoft excel"}),
    frozenset({"amazon web services", "python", "node.js"}),
)


def normalize_text(value: str) -> str:
    return " ".join(value.casefold().strip().split())


def normalize_skill(value: str) -> str:
    compact = re.sub(r"[^a-z0-9]+", "", value.casefold())
    return _ALIAS_TO_CANONICAL.get(compact, normalize_text(value))


def semantic_related(candidate_skill: str, target_skill: str) -> bool:
    candidate = normalize_skill(candidate_skill)
    target = normalize_skill(target_skill)
    return candidate != target and any(
        candidate in group and target in group for group in RELATED_SKILL_GROUPS
    )
