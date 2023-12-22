import rough from "npm:roughjs";

class MockNode {
  readonly ns: string;
  readonly tagName: string;
  readonly ownerDocument: MockDocument;

  readonly attrs: Record<string, string> = {};
  readonly children: MockNode[] = [];

  constructor(ns: string, tagName: string, ownerDocument: MockDocument) {
    this.ns = ns;
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
  }

  setAttribute(key: string, value: string) {
    this.attrs[key] = value;
  }

  appendChild(node: MockNode) {
    this.children.push(node);
  }
}

class MockDocument {
  createElementNS(ns: string, tagName: string) {
    return new MockNode(ns, tagName, this);
  }
}

const root = new MockNode(
  "http://www.w3.org/2000/html",
  "html",
  new MockDocument(),
);

console.log(rough);
const r = rough.svg(root);
const rect = r.rectangle(0, 0, 1, 1);
const circle = r.circle(10, 10, 10);
console.log({ root, rect, circle });
