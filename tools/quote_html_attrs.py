#!/usr/bin/env python3
from pathlib import Path


def is_name_char(c: str) -> bool:
	return c.isalnum() or c in "-_:"


def quote_html_attrs(html: str) -> str:
	out = []
	i, n = 0, len(html)
	while i < n:
		if html.startswith("<!--", i):
			j = html.find("-->", i + 4)
			j = n if j < 0 else j + 3
			out.append(html[i:j])
			i = j
			continue
		if html.startswith("<!", i) or html.startswith("<?", i):
			j = html.find(">", i)
			j = n if j < 0 else j + 1
			out.append(html[i:j])
			i = j
			continue
		if html[i] != "<":
			out.append(html[i])
			i += 1
			continue
		out.append("<")
		i += 1
		if i < n and html[i] == "/":
			out.append("/")
			i += 1
		start = i
		while i < n and is_name_char(html[i]):
			i += 1
		out.append(html[start:i])
		while i < n:
			c = html[i]
			if c.isspace():
				i += 1
				while i < n and html[i].isspace():
					i += 1
				out.append(" ")
				continue
			if c == ">":
				out.append(">")
				i += 1
				break
			if c == "/" and i + 1 < n and html[i + 1] == ">":
				out.append("/>")
				i += 2
				break
			ns = i
			while i < n and is_name_char(html[i]):
				i += 1
			name = html[ns:i]
			if not name:
				out.append(c)
				i += 1
				continue
			out.append(name)
			j = i
			while j < n and html[j].isspace():
				j += 1
			if j < n and html[j] == "=":
				i = j + 1
				while i < n and html[i].isspace():
					i += 1
				if i < n and html[i] in "\"'":
					q = html[i]
					i += 1
					vs = i
					while i < n and html[i] != q:
						i += 1
					val = html[vs:i]
					if i < n:
						i += 1
					out.append('="')
					if q == "'":
						out.append(val.replace("&", "&amp;").replace('"', "&quot;"))
					else:
						out.append(val.replace('"', "&quot;"))
					out.append('"')
				else:
					vs = i
					while i < n and (not html[i].isspace()) and html[i] != ">":
						i += 1
					val = html[vs:i]
					if val.endswith("/") and i < n and html[i] == ">":
						val = val[:-1]
						i -= 1
					out.append('="')
					out.append(val.replace("&", "&amp;").replace('"', "&quot;"))
					out.append('"')
	return "".join(out)


VOID = {
	"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
	"param", "source", "track", "wbr",
}


def tokenize(html: str) -> list[str]:
	tokens = []
	i, n = 0, len(html)
	while i < n:
		if html[i] != "<":
			j = html.find("<", i)
			j = n if j < 0 else j
			tokens.append(html[i:j])
			i = j
			continue
		if html.startswith("<!--", i):
			j = html.find("-->", i + 4)
			j = n if j < 0 else j + 3
			tokens.append(html[i:j])
			i = j
			continue
		j = i + 1
		in_quote = ""
		while j < n:
			c = html[j]
			if in_quote:
				if c == in_quote:
					in_quote = ""
			elif c in "\"'":
				in_quote = c
			elif c == ">":
				j += 1
				break
			j += 1
		tokens.append(html[i:j])
		i = j
	return tokens


def tag_name(tag: str) -> str:
	i = 1
	if i < len(tag) and tag[i] == "/":
		i += 1
	start = i
	while i < len(tag) and is_name_char(tag[i]):
		i += 1
	return tag[start:i].lower()


def indent_html(html: str) -> str:
	lines = []
	level = 0
	for token in tokenize(html):
		if not token:
			continue
		if token[0] != "<":
			text = token.strip()
			if text:
				lines.append("  " * level + text)
			continue
		name = tag_name(token)
		closing = token.startswith("</")
		self_close = token.endswith("/>") or name in VOID or token.startswith("<!")
		if closing:
			level = max(0, level - 1)
		lines.append("  " * level + token)
		if not closing and not self_close:
			level += 1
	return "\n".join(lines) + "\n"


def main() -> None:
	for path in [Path("src/player/player.html"), Path("src/player/report.html")]:
		raw = path.read_text(encoding="utf-8")
		quoted = quote_html_attrs(raw)
		formatted = indent_html(quoted)
		path.write_text(formatted, encoding="utf-8")
		print(f"{path}: {len(raw)} -> {len(formatted)} lines")
		print(formatted.splitlines()[0][:180])
		print("---")


if __name__ == "__main__":
	main()
