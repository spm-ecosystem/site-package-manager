# Veneer Spec Language Guide & Specification

The Veneer Spec (`.vnr`) configuration language is a custom declarative DSL built specifically for the Site Package Manager (SPM). It eliminates the friction of writing large, verbose, and error-prone JSON configuration manifests by introducing structural semantics, strict class inheritance, raw string literal support, and a type-safe parser.

---

## 1. Syntax & Keywords Reference

### `theme`
Defines the main metadata, visual variables, and global CSS styles for a website package.
```scss
theme "ModernDark" {
    variables {
        --spm-accent: "#7c6af5";
        --spm-bg-primary: "#000000";
        --spm-bg-secondary: "#111111";
        --spm-text-primary: "#ffffff";
    }
    customStyles: "#advertisement-banner { display: none !important; }";
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
selector "#sub-navbar" {
    action: hide;
}

selector "#search-input-box" -> UiSearchBar {
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
reconstruct "#gallery-container" -> UiGridPage {
    urlPattern: "page=gallery";
    pageTitle: "Gallery";
    height: "calc(100vh - 80px)";
}
```

### `preserve`
Prevents specific legacy DOM components from being destroyed, reparenting them inside the new React layout.
```scss
reconstruct "#item-view" -> UiItemDetailsPage {
    preserve {
        sidebarSlot: ".sidebar"; // Reparents .sidebar into the React sidebarSlot
    }
}
```

### `child`
Defines a nested data extraction rule. The compiler processes this as a property array passed to the parent component.
```scss
reconstruct "#gallery-container" -> UiGridPage {
    child items {
        selector: "#gallery-container .item";
        bind imageUrl: "img | attr:src";
        bind linkUrl: "a | attr:href";
    }
}
```

### `bind`
Maps properties of a child element or component dynamically using extraction rules from the legacy HTML page.
```scss
bind count: "span.count-badge | text";
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
Instead of writing `"example\\.com\\\\/?(?:index\\.html)?$"` (which requires double escaping in JSON), you write:
```scss
urlPattern: R"(example\.com\/?(?:index\.html)?$)";
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
    *   Child Autocomplete: Nesting inside `child` blocks triggers property suggestions matching the list items (e.g. inside `child items` of `UiGridPage`, it suggests `imageUrl` and `linkUrl`).
3.  **Background Diagnostics (Linter)**:
    Whenever a `.vnr` file is modified, the extension executes the background linter. Any compiler parsing error or resolver validation error (like inheritance loops or undefined classes) is reflected directly as a red squiggly line in the editor at the exact line of the error.

---

## 5. Complete Theme: Agnostic Example

Here is a complete modular layout structure for an agnostic website theme project.

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
    bind count: "span.count-badge | text";
    bind type: "self | attr:class";
    bind url: "a:last-of-type | attr:href";
}
```

### 2. `theme.vnr`
Defines visual custom properties and notices.
```scss
theme "ModernDark" {
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
    customStyles: "#system-banner, #cookie-consent-bar { display: none !important; }";
}
```

### 3. `navigation.vnr`
Defines standard header replacements and links.
```scss
selector "#header-container, #navbar, header" -> UiNavHeader {
    action: replace;
    className: "site-navigation-header";
    logoHref: "https://example.com/";
    
    primaryLinks: R"([
      { "label": "My Account", "url": "https://example.com/account" },
      { "label": "Items", "url": "https://example.com/items?action=list" },
      { "label": "Comments", "url": "https://example.com/comments" },
      { "label": "Wiki Pages", "url": "https://example.com/wiki" },
      { "label": "Statistics", "url": "https://example.com/stats" },
      { "label": "Help Desk", "url": "https://example.com/help" }
    ])";

    secondaryLinks: R"([
      { "label": "Upload Item", "url": "https://example.com/items/upload" },
      { "label": "My Favorites", "url": "https://example.com/favorites" },
      { "label": "Random Item", "url": "https://example.com/items/random" },
      { "label": "Contact Us", "url": "https://example.com/contact" },
      { "label": "Terms of Service", "url": "https://example.com/tos" }
    ])";

    bind logoUrl: "#site-logo img | attr:src";
    bind siteName: "#site-logo a | text";
}

selector "#sub-navbar" {
    action: hide;
}

selector "#sidebar-search form, .search-container form" -> UiSearchBar {
    action: replace;
    placeholder: "Search items…";
    submitUrl: "https://example.com/items";
    queryParamName: "q";
    bind defaultValue: "input[name='q'] | attr:value";
}
```

### 4. `pages.vnr`
Defines full pages layouts using primary components.
```scss
reconstruct "#home-landing" -> UiHeroLanding {
    urlPattern: R"(example\.com\/?(?:index\.html)?$)";
    tagline: "The Modern Search Engine";
    subtext: "Browse millions of cataloged resources, updated in real time.";
    ctaLabel: "Browse Catalog";
    ctaUrl: "https://example.com/items?action=list";
    searchPlaceholder: "Search catalog... (e.g. category:news keyword)";
    searchSubmitUrl: "https://example.com/items";
    searchParamName: "q";

    bind logoUrl: "img[alt='Company Logo'] | attr:src";
    bind siteName: "img[alt='Company Logo'] | attr:alt";

    child primaryLinks extends StandardLink {
        selector: "#quick-links a";
    }
}

reconstruct "#gallery-view" -> UiGridPage {
    urlPattern: "page=gallery";
    pageTitle: "Catalog Gallery";
    className: "modern-grid-gallery";
    height: "calc(100vh - 80px)";
    sidebarWidth: "260px";
    showSearch: true;
    searchPlaceholder: "Search items…";
    searchSubmitUrl: "https://example.com/items";
    searchParamName: "q";
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
      { "title": "Categories", "typeKey": "category" },
      { "title": "Tags", "typeKey": "tag" },
      { "title": "Creators", "typeKey": "creator" },
      { "title": "System Data", "typeKey": "metadata" }
    ])";

    bind searchDefaultValue: ".sidebar-filter form input[name='q'] | attr:value";

    child items {
        selector: "#gallery-view .item-card";
        bind id: "self | attr:id";
        bind imageUrl: "img | attr:src";
        bind linkUrl: "a | attr:href";
        bind title: "img | attr:title";
    }

    child tags extends TagItem {
        selector: "#sidebar-tags li";
    }

    child pageLinks extends StandardLink {
        selector: "#paginator .pagination a";
    }
}
```
