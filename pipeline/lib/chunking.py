from pathlib import Path


def load_manual_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8", errors="ignore").splitlines()


def chunk_lines(lines: list[str], chunk_size: int = 900, overlap: int = 60) -> list[dict]:
    chunks = []
    i = 0
    idx = 0
    n = len(lines)
    while i < n:
        end = min(i + chunk_size, n)
        text = "\n".join(lines[i:end])
        chunks.append({"chunk_index": idx, "start_line": i, "end_line": end, "text": text})
        idx += 1
        if end == n:
            break
        i = end - overlap
    return chunks
