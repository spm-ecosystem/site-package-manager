# Veneer Spec Language Guide & Specification

The Veneer Spec (`.vnr`) configuration language is a custom declarative DSL built specifically for the Site Package Manager (SPM). It eliminates the friction of writing large, verbose, and error-prone JSON configuration manifests by introducing structural semantics, strict class inheritance, raw string literal support, and a type-safe parser.

---

## 1. Syntax & Keywords Reference

### `theme`
Defines the main metadata, visual variables, and global CSS styles for a website package.
```scss
theme "Obsidian" {
    variables {
        --spm-accent: "#7c6af5";
        --spm-bg-primary: "#000000";
        --spm-bg-secondary: "#111111";
        --spm-text-primary: "#ffffff";
    }
    customStyles: "#notice { display: none !important; }";
}
```

### `class` & `extends`
Classes allow you to define reuse contracts for child nodes. A class can extend another class, inheriting all its bindings, scope, and selectors, and overriding them when needed.
```scss
class LinkBase {
    bind label: "self | text";
    bind url: "self | attr:href";
}

class DocumentLink extends LinkBase {
    scope: "document";
}
```

### `selector` & `action`
Target and perform actions on individual elements. Typically used to hide ads or replace headers.
```scss
selector "#subnavbar" {
    action: hide;
}

selector "#search-box" -> UiSearchBar {
    action: replace;
    placeholder: "Search…";
    submitUrl: "https://example.com/search";
    queryParamName: "q";
    bind defaultValue: "input[name='q'] | attr:value";
}
```

### `reconstruct`
Transforms a large page container into a React layout component.
```scss
reconstruct "#post-list" -> UiModernGridPage {
    urlPattern: "page=post&s=list";
    pageTitle: "Gallery";
    height: "calc(100vh - 78px)";
}
```

### `preserve`
Prevents specific legacy DOM components from being destroyed, reparenting them inside the new React layout.
```scss
reconstruct "#comment-view" -> UiCommentListPage {
    preserve {
        sidebarSlot: ".sidebar"; // Reparents .sidebar into the React sidebarSlot
    }
}
```

### `child`
Defines a nested data extraction rule. The compiler processes this as a property array passed to the parent component.
```scss
reconstruct "#post-list" -> UiModernGridPage {
    child items {
        selector: "#post-list .thumb";
        bind imageUrl: "img | attr:src";
        bind linkUrl: "a | attr:href";
    }
}
```

### `bind`
Maps properties of a child element or component dynamically using extraction rules from the legacy HTML page.
```scss
bind count: "span.tag-count | text";
```

### `scope`
Controls the query lookup container. Default is `"container"` (searches only within the parent component's DOM container). Set to `"document"` to run queries from the global root document (useful for pagination or headers outside the main layout container).
```scss
child pageLinks {
    scope: "document";
    selector: "#paginator .pagination a";
}
```

---

## 2. Raw String Literals

To prevent syntax noise and backslash escaping for regular expressions or inline JSON configurations (like grid column structures or navigation links), the compiler supports raw C++ string literals:

$$\text{R"delim(content)delim"}$$

### Examples

**A. Regex Patterns without Backslash Escaping:**
Instead of writing `"safebooru\\.org\\\\/?(?:index\\.php)?$"` (which requires double escaping in JSON), you write:
```scss
urlPattern: R"(safebooru\.org\/?(?:index\.php)?$)";
```

**B. Inline Complex Column Configurations:**
Instead of encoding arrays as strings, use raw string blocks to pass pure JSON payloads:
```scss
columns: R"([
  { "key": "pending", "header": "Pending", "width": "60px", "type": "checkbox" },
  { "key": "aliasName", "header": "Alias", "type": "link", "urlKey": "aliasUrl" },
  { "key": "toName", "header": "To Tag", "type": "link", "urlKey": "toUrl" }
])";
```

---

## 3. Advanced Compiler Features

### Recursive Nested Children
The compiler supports arbitrary nesting of `child` nodes within parent `child` blocks.
- **Resolver**: Inheritance is recursively applied down the child chain.
- **Emitter**: Serializes nested objects inside a `"children"` array attribute of the child node.
This is heavily used to represent deep structural layouts like threaded comment trees (`threads` containing `tags` and `comments` arrays).

### Workspace Compilation vs Single File Linting
- **Directory Mode (`spm compile <dir> -o manifest.json`)**: Concatenates all `.vnr` files, registers all classes globally, and outputs the merged manifest layout.
- **Sibling Class Autoloading (`spm compile <file.vnr> -o output.json`)**: When compiling a single `.vnr` file, the compiler automatically locates all sibling `.vnr` files in the same directory, parses their `class` definitions, and merges them into the resolver's inheritance graph. This allows you to compile or lint single files (e.g. `tables.vnr`) referencing classes declared in other files (e.g. `classes.vnr`) in absolute isolation without resolver failures.

---

## 4. VS Code Developer Experience (IntelliSense)

The VS Code extension `vscode-theme-manifest-intellisense` provides:

1.  **Syntax Highlighting**: Real-time syntax coloring for keywords, CSS variables, operators, selectors, and raw string delimiters.
2.  **Smart Autocomplete**:
    *   Reconstruct Arrow Completion: Typing `->` suggests all layout components available in the SPM registry.
    *   Contextual Property Suggestions: Inside a reconstruct block, it offers type-safe property names matching the component's TypeScript props contract.
    *   Child Autocomplete: Nesting inside `child` blocks triggers property suggestions matching the list items (e.g. inside `child items` of `UiModernGridPage`, it suggests `imageUrl` and `linkUrl`).
3.  **Background Diagnostics (Linter)**:
    Whenever a `.vnr` file is modified, the extension executes the background linter. Any compiler parsing error or resolver validation error (like inheritance loops or undefined classes) is reflected directly as a red squiggly line in the editor at the exact line of the error.

---

## 5. Safebooru Obsidian Theme: Complete Example

Here is the complete modular structure of the Safebooru Obsidian Dark theme project.

### 1. `classes.vnr`
Declares shared schemas and scopes.
```scss
class StandardLink {
    bind label: "self | text";
    bind url: "self | attr:href";
}

class DocumentLink extends StandardLink {
    scope: "document";
}

class TagItem {
    scope: "document";
    bind name: "a:last-of-type | text";
    bind count: "span.tag-count | text";
    bind type: "self | attr:class";
    bind url: "a:last-of-type | attr:href";
}
```

### 2. `theme.vnr`
Defines visual custom properties and notices.
```scss
theme "Obsidian" {
    variables {
        --spm-accent: "#7c6af5";
        --spm-accent-fg: "#ffffff";
        --spm-accent-hover: "#9d8fff";
        --spm-bg-primary: "#000000";
        --spm-bg-secondary: "#111111";
        --spm-bg-tertiary: "#222222";
        --spm-border: "#333333";
        --spm-radius: "10px";
        --spm-text-muted: "#a1a1aa";
        --spm-text-primary: "#ffffff";
    }
    customStyles: "#notice, #long-notice, #has-mail-notice, #safe-image-notice { display: none !important; }";
}
```

### 3. `navigation.vnr`
Defines standard header replacements and links.
```scss
selector "#header, #navbar, header, .navbar, #topbar" -> UiNavHeader {
    action: replace;
    className: "safebooru-site-nav";
    logoHref: "https://safebooru.org/";
    
    primaryLinks: R"([
      { "label": "My Account", "url": "https://safebooru.org/index.php?page=account&s=home" },
      { "label": "Posts", "url": "https://safebooru.org/index.php?page=post&s=list&tags=all" },
      { "label": "Comments", "url": "https://safebooru.org/index.php?page=comment&s=list" },
      { "label": "Wiki", "url": "https://safebooru.org/index.php?page=wiki&s=list" },
      { "label": "Aliases", "url": "https://safebooru.org/index.php?page=alias&s=list" },
      { "label": "Artists", "url": "https://safebooru.org/index.php?page=artist&s=list" },
      { "label": "Tags", "url": "https://safebooru.org/index.php?page=tags&s=list" },
      { "label": "Pools", "url": "https://safebooru.org/index.php?page=pool&s=list" },
      { "label": "Forum", "url": "https://safebooru.org/index.php?page=forum&s=list" },
      { "label": "Stats", "url": "https://safebooru.org/index.php?page=stats" },
      { "label": "Help", "url": "https://safebooru.org/index.php?page=help" }
    ])";

    secondaryLinks: R"([
      { "label": "Video", "url": "https://safebooru.org/index.php?page=post&s=list&tags=video" },
      { "label": "Upload", "url": "https://safebooru.org/index.php?page=post&s=add" },
      { "label": "My Favorites", "url": "https://safebooru.org/index.php?page=favorites&s=view" },
      { "label": "Random", "url": "https://safebooru.org/index.php?page=post&s=random" },
      { "label": "Contact Us", "url": "https://safebooru.org/index.php?page=contact" },
      { "label": "DMCA", "url": "https://safebooru.org/index.php?page=dmca" },
      { "label": "About", "url": "https://safebooru.org/index.php?page=about" },
      { "label": "Help", "url": "https://safebooru.org/index.php?page=help&topic=post" },
      { "label": "TOS", "url": "https://safebooru.org/index.php?page=tos" }
    ])";

    bind logoUrl: "#site-title img | attr:src";
    bind siteName: "#site-title a | text";
}

selector "#subnavbar" {
    action: hide;
}

selector "#tag-sidebar form, .tag-search form, .sidebar form" -> UiSearchBar {
    action: replace;
    placeholder: "Search tags…";
    submitUrl: "https://safebooru.org/index.php?page=post&s=list";
    queryParamName: "tags";
    bind defaultValue: "input[name='tags'] | attr:value";
}
```

### 4. `pages.vnr`
Defines full pages layouts using primary components.
```scss
reconstruct "#static-index" -> UiHeroLanding {
    urlPattern: R"(safebooru\.org\/?(?:index\.php)?$)";
    tagline: "Anime picture search engine";
    subtext: "Browse millions of safe anime illustrations, updated hourly.";
    ctaLabel: "Browse Gallery";
    ctaUrl: "https://safebooru.org/index.php?page=post&s=list&tags=all";
    searchPlaceholder: "Search tags... (e.g. blue_hair 1girl)";
    searchSubmitUrl: "https://safebooru.org/index.php?page=post&s=list";
    searchParamName: "tags";

    bind logoUrl: "img[alt='Safebooru'] | attr:src";
    bind siteName: "img[alt='Safebooru'] | attr:alt";

    child primaryLinks extends StandardLink {
        selector: "#links a";
    }
}

reconstruct "#post-list" -> UiModernGridPage {
    urlPattern: "page=post&s=list";
    pageTitle: "Gallery";
    className: "safebooru-gallery";
    height: "calc(100vh - 78px)";
    sidebarWidth: "260px";
    showSearch: true;
    searchPlaceholder: "Search tags…";
    searchSubmitUrl: "https://safebooru.org/index.php?page=post&s=list";
    searchParamName: "tags";
    mobileColumns: 2;
    mobileGap: "8px";
    mobilePadding: "8px";
    mobileShowHeader: true;
    mobileHeaderSticky: true;
    mobileShowPagination: true;
    mobileCardAspectRatio: "1 / 1.28";
    hideSidebarOnMobile: true;
    mobileBreakpoint: 720;
    
    tagGroups: R"([
      { "title": "Artists", "typeKey": "artist" },
      { "title": "Copyrights", "typeKey": "copyright" },
      { "title": "Characters", "typeKey": "character" },
      { "title": "General", "typeKey": "general" },
      { "title": "Meta", "typeKey": "metadata" }
    ])";

    bind searchDefaultValue: ".sidebar form input[name='tags'] | attr:value";

    child items {
        selector: "#post-list .thumb";
        bind id: "self | attr:id";
        bind imageUrl: "img | attr:src";
        bind linkUrl: "a | attr:href";
        bind title: "img | attr:title";
    }

    child tags extends TagItem {
        selector: "#tag-sidebar li";
    }

    child pageLinks extends StandardLink {
        selector: "#paginator .pagination a";
    }
}
```
