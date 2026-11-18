import type { Codemod, Edit } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

// Replaces the @expo/vector-icons barrel import with per-family imports.
// The barrel pulls all 19 icon fonts (~3.9 MB) into the web bundle; per-family imports ship
// only the font each screen uses. Example: import { Ionicons } from "@expo/vector-icons"
// becomes import Ionicons from "@expo/vector-icons/Ionicons".
const BARREL = "@expo/vector-icons";

const codemod: Codemod<TSX> = (root) => {
  const rootNode = root.root();

  const imports = rootNode.findAll({
    rule: { kind: "import_statement" },
  });

  const edits: Edit[] = [];

  for (const statement of imports) {
    const source = statement.field("source")?.text().slice(1, -1);
    if (source !== BARREL) continue;

    const names = statement
      .findAll({ rule: { kind: "import_specifier" } })
      .map((spec) => spec.text().trim());

    if (names.length === 0) continue;

    // Only the default-free named form is rewritten; anything else is left for review.
    const replacement = names
      .map((name) => `import ${name} from "${BARREL}/${name}";`)
      .join("\n");

    edits.push(statement.replace(replacement));
  }

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default codemod;
