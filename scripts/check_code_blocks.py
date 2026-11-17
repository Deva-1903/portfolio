"""Run the Python code blocks in a Markdown/MDX post and check their printed output.

Usage:
    python scripts/check_code_blocks.py <file.md|file.mdx> [more files...] [--write]

Conventions:
  * Every ```python fence is executed. Blocks run in order, in one fresh namespace
    per `## ` section, so each `## ` section must do its own imports.
  * The ```output fence directly after a python fence (blank lines allowed between)
    is what that block prints. Exceptions are shown as `TypeName: message` and
    warnings as `CategoryName: message`, in the order they happen.
  * ```python nocheck  -> run it (later blocks may need its variables) but don't compare
                          its output; use it for timings or anything else non-deterministic.
  * ```python norun    -> don't run it at all (e.g. code that needs a GPU).
  * Other languages (bash, text, ...) are ignored.

Without --write the script compares and exits 1 on any mismatch, printing a diff.
With --write it rewrites every output fence in place from the real output (adding one
where a block prints but has none), leaving `nocheck` blocks alone.
Both modes list every block that raised, so you can confirm each error is intentional.

Run it with a Python that has the libraries the post imports (NumPy and PyTorch
for the ML fundamentals posts).
"""

from __future__ import annotations

import argparse
import contextlib
import difflib
import io
import re
import sys
import traceback
import warnings
from dataclasses import dataclass, field
from pathlib import Path

FENCE = re.compile(r"^(?P<indent>[ \t]*)(?P<fence>`{3,}|~{3,})(?P<info>.*)$")


@dataclass
class Block:
    lang: str
    meta: list[str]
    open_line: int  # index of the opening fence line
    close_line: int  # index of the closing fence line
    body: list[str]
    section: int
    output: "Block | None" = None
    actual: str = ""
    raised: str | None = None
    flags: set[str] = field(default_factory=set)


def parse(lines: list[str]) -> list[Block]:
    blocks: list[Block] = []
    section = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        m = FENCE.match(line)
        if not m:
            if line.startswith("## "):
                section += 1
            i += 1
            continue
        fence = m.group("fence")
        info = m.group("info").strip().split()
        lang = info[0].lower() if info else ""
        body: list[str] = []
        j = i + 1
        while j < len(lines):
            close = FENCE.match(lines[j])
            if (close and close.group("fence")[0] == fence[0]
                    and len(close.group("fence")) >= len(fence) and not close.group("info").strip()):
                break
            body.append(lines[j])
            j += 1
        else:
            raise SystemExit(f"line {i + 1}: unclosed code fence")
        blocks.append(Block(lang, info[1:], i, j, body, section))
        i = j + 1

    # Pair each python block with the output fence right after it
    for k, block in enumerate(blocks):
        if block.lang != "python" or k + 1 >= len(blocks):
            continue
        nxt = blocks[k + 1]
        between = lines[block.close_line + 1: nxt.open_line]
        if nxt.lang == "output" and all(not s.strip() for s in between):
            block.output = nxt
    return blocks


def normalize(text: str) -> str:
    return "\n".join(line.rstrip() for line in text.rstrip().splitlines())


def run(blocks: list[Block]) -> None:
    namespaces: dict[int, dict] = {}
    for block in blocks:
        if block.lang != "python" or "norun" in block.meta:
            continue
        ns = namespaces.setdefault(block.section, {"__name__": "__main__"})
        buf = io.StringIO()

        def show(message, category, filename, lineno, file=None, line=None, _buf=buf):
            _buf.write(f"{category.__name__}: {message}\n")

        code = "\n".join(block.body) + "\n"
        with warnings.catch_warnings(), contextlib.redirect_stdout(buf):
            warnings.simplefilter("always")
            warnings.showwarning = show
            try:
                exec(compile(code, f"<block at line {block.open_line + 1}>", "exec"), ns)
            except Exception as exc:  # shown in the post as `Type: message`
                block.raised = f"{type(exc).__name__}: {exc}"
                buf.write(block.raised + "\n")
                if "--traceback" in sys.argv:
                    traceback.print_exc(file=sys.stderr)
        block.actual = normalize(buf.getvalue())


def check(path: Path, blocks: list[Block]) -> int:
    problems = 0
    for block in blocks:
        if block.lang != "python" or "norun" in block.meta or "nocheck" in block.meta:
            continue
        where = f"{path}:{block.open_line + 1}"
        if block.output is None:
            if block.actual:
                problems += 1
                print(f"\n{where}: block prints output but has no ```output fence after it:")
                print("    " + block.actual.replace("\n", "\n    "))
            continue
        expected = normalize("\n".join(block.output.body))
        if expected != block.actual:
            problems += 1
            print(f"\n{where}: output differs")
            diff = difflib.unified_diff(expected.splitlines(), block.actual.splitlines(),
                                        "in the post", "actual", lineterm="")
            print("\n".join("    " + d for d in diff))
    return problems


def write(path: Path, lines: list[str], blocks: list[Block]) -> None:
    out = list(lines)
    # Edit from the bottom up so earlier line numbers stay valid
    for block in reversed(blocks):
        if block.lang != "python" or "norun" in block.meta or "nocheck" in block.meta:
            continue
        new_body = block.actual.splitlines() if block.actual else []
        if block.output is not None:
            o = block.output
            out[o.open_line + 1: o.close_line] = new_body
        elif new_body:
            indent = FENCE.match(lines[block.open_line]).group("indent")
            out[block.close_line + 1: block.close_line + 1] = (
                ["", f"{indent}```output", *new_body, f"{indent}```"])
    path.write_text("\n".join(out) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--write", action="store_true", help="rewrite output fences from real output")
    parser.add_argument("--traceback", action="store_true", help="print tracebacks for raised blocks")
    args = parser.parse_args()

    failed = 0
    for path in args.files:
        lines = path.read_text().splitlines()
        blocks = parse(lines)
        run(blocks)
        py = [b for b in blocks if b.lang == "python"]
        raised = [b for b in py if b.raised]
        print(f"{path}: {len(py)} python blocks, {len(raised)} raised")
        for b in raised:
            print(f"  raised at line {b.open_line + 1}: {b.raised.splitlines()[0]}")
        if args.write:
            write(path, lines, blocks)
            print(f"  wrote outputs to {path}")
        else:
            problems = check(path, blocks)
            if problems:
                print(f"\n{path}: {problems} block(s) don't match")
                failed += 1
            else:
                print("  all outputs match")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
