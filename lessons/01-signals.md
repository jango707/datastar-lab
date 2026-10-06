# Lesson 1 — Signals (no server)

> 👤 **For humans.** A step-by-step walkthrough to read alongside the running page.
> *(AI agents: your instructions are in [`AGENTS.md`](../AGENTS.md) and [`ai/`](../ai/), not here.)*

| | |
|---|---|
| **Page** | <http://localhost:4321/lessons/signals> |
| **Code** | [`src/demos/01-signals.tsx`](../src/demos/01-signals.tsx) |
| **Time** | ~30 minutes |
| **You'll learn** | `data-signals`, `$name` expressions, `data-on:*`, `data-text`, `data-show`, `data-class`, `data-attr`, `data-bind`, `data-computed` |

---

## The idea

A **signal** is a named value that the page reacts to. You declare it in HTML. Any attribute that reads it re-runs automatically when it changes.

All the signals on a page live in **one shared store**. The **Live signals** panel (right-hand column on wide screens, bottom of the page on narrow ones) prints that store as JSON. Keep an eye on it the whole time.

Datastar attributes come in two shapes:

```html
data-thing="expression"          <!-- e.g. data-text="$count" -->
data-thing:key="expression"      <!-- e.g. data-on:click="$count++" -->
```

The values are **JavaScript expressions**. `$count` means "the signal called `count`".

## Before you start

1. `bun install`, then `bun run dev`
2. Open the page, then open DevTools with the **Elements** and **Network** tabs side by side.

---

## Step 1 — Prove there's no server involved

1. In the Network tab, clear the log.
2. Click every button and type in every input on the page.
3. **Notice:** nothing appears in Network. Every demo in this lesson runs in the browser. The server only sent the HTML once.

## Step 2 — Counter: declare, change, react

What the browser receives:

```html
<div data-signals='{"count":0}'>
  <p data-text="$count" data-class:neg="$count < 0">0</p>
  <button data-on:click="$count--">−1</button>
  <button data-on:click="$count++">+1</button>
  <button data-on:click="$count = 0" data-attr:disabled="$count === 0">Reset</button>
</div>
```

| Attribute | What it does |
|---|---|
| `data-signals='{"count":0}'` | Creates `$count` with the value `0` |
| `data-text="$count"` | Sets the element's text to the value of the expression |
| `data-class:neg="$count < 0"` | Adds the `neg` class while the expression is true |
| `data-on:click="$count--"` | Runs the expression on click. It's an *assignment*, so it changes the signal |
| `data-attr:disabled="$count === 0"` | Sets an attribute reactively. Here, Reset is disabled at zero |

**Try it:** click −1 twice. The number turns red (the `neg` class) and Reset becomes clickable.

**Breakdown:**
- The `0` written inside `<p>` is the **fallback**: what you see before Datastar loads. Keep fallbacks the same as the initial state.
- In the TSX source you'll see `data-signals={signals({ count: 0 })}`. The `signals()` helper (`src/lib/signals.ts`) JSON-encodes server data safely: it escapes `<` so a value can never close a tag.

## Step 3 — Toggle panel: show/hide without a flash

```html
<button data-on:click="$open = !$open"
        data-attr:aria-expanded="$open ? 'true' : 'false'"
        data-text="$open ? 'Hide details' : 'Show details'">Show details</button>
<div data-show="$open" style="display:none">…</div>
```

**Try it:** open and close the panel. In Elements, watch `aria-expanded` flip between `"true"` and `"false"`.

**Breakdown:**
- `data-show` sets `display: none` while the expression is false.
- `style="display:none"` hides the panel **before Datastar has loaded**. Without it, a hidden panel shows briefly and then disappears (see *Break it #1*).
- Why `$open ? 'true' : 'false'` instead of just `$open`? Because `data-attr` **removes** the attribute when the value is `false`, and sets it to an empty string when the value is `true`. That's right for `disabled`, but wrong for ARIA attributes, which need the literal strings `"true"` and `"false"` (see *Break it #3*).

## Step 4 — Live preview: two-way binding

```html
<div data-signals='{"name":"","email":"","role":"learner"}'
     data-computed:email-ok="/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($email)">
  <input data-bind="name">
  <input data-bind="email">
  <select data-bind="role">…</select>

  <strong data-text="$name.trim() || 'stranger'">stranger</strong>
  <p data-text="`${$name.length} characters typed`"></p>
  <p data-show="$email !== ''" style="display:none">
    <span data-text="$emailOk ? '✓ looks like an email' : '✗ not an email yet'"></span>
  </p>
</div>
```

**Try it:** type a name and watch the preview *and* the Live signals panel. Then type `grace@` (you get ✗) and finish it as `grace@navy.mil` (you get ✓).

**Breakdown:**
- `data-bind="name"` links the input and `$name` in **both directions**: typing updates the signal, and changing the signal updates the input.
- `data-computed:email-ok` creates a **read-only, derived** signal. The key is kebab-case and the signal is camelCase: `email-ok` becomes `$emailOk`.
- Expressions are full JavaScript, including template literals and regex.

## Step 5 — Computed totals

```html
<div data-signals='{"qty":2,"price":15}' data-computed:subtotal="$qty * $price">
  <input type="number" data-bind="qty">
  <input type="number" data-bind="price">
  <dd data-text="'£' + $subtotal.toFixed(2)">£30.00</dd>
  <dd data-text="'£' + ($qty * $price * 1.2).toFixed(2)">£36.00</dd>
</div>
```

**Try it:** change Quantity to 3. You should see Subtotal £45.00, VAT £9.00 and Total £54.00.

**Breakdown:**
- A computed signal re-calculates whenever any signal it reads changes. There's no event wiring.
- **`data-bind` keeps the type of the initial value.** `qty` started as the number `2`, so after you type `3` the inspector shows `3`, not `"3"`. If it had started as the string `'2'`, you'd get strings back, and `+` would join them instead of adding them (see *Break it #4*).

## Step 6 — Gotcha: HTML lowercases attribute names

**Try it:** type in the **Broken** input, then in the **Fixed** one, and watch the readout underneath.

- Broken (`data-bind:userName=""`) fills **`$username`**: a brand-new signal, all lowercase.
- Fixed (`data-bind="userName"`) fills **`$userName`**, the signal that was declared.

**Why:** the browser's HTML parser lowercases every attribute **name** before Datastar sees it. Datastar can turn kebab-case into camelCase (`data-bind:user-name` → `$userName`), but it can't recover capitals the parser has already thrown away.

**Rule:** use the value form for binding (`data-bind="userName"`) and kebab-case keys everywhere else (`data-computed:email-ok`).

> **Side note (Hono JSX):** writing the key form with no value (`<input data-bind:userName />`) makes Hono output `data-bind:userName="true"`. Datastar then throws `KeyAndValueProvided`, because you gave it both a key and a value. The demo uses `=""` to avoid that.

## Step 7 — Gotcha: a toggled class doesn't beat a static one

**Try it:** click **Select**. Only the **Fixed** swatch gets the accent border. Inspect the **Broken** swatch: its class list is `swatch gc-muted gc-accent`, so both classes are on it.

**Why:** both classes set `border-color`, with equal specificity. When two rules tie like that, the one that comes **later in the stylesheet** wins. In `public/lab.css`, `.gc-muted` comes after `.gc-accent`, so muted always wins. The signal changed, but the CSS cascade decides what you see.

**Rule:** when two classes compete for the same property, switch them as a pair so only one is ever applied:

```html
data-class="{'gc-accent': $gcPicked, 'gc-muted': !$gcPicked}"
```

---

## Break it

Each exercise changes **one thing** in [`src/demos/01-signals.tsx`](../src/demos/01-signals.tsx). The server reloads itself (`bun --hot`); just refresh the browser. Undo each change before starting the next one.

1. **The flash.** Delete `style="display:none"` from the toggle panel. In DevTools → Network, set throttling to *Slow 4G* and hard-reload. → The panel appears briefly, then disappears when Datastar loads.
2. **Typos fail silently.** Change the counter's `data-text="$count"` to `data-text="$conut"`. → The number goes blank and **there's no error**. An unknown signal just reads as empty. When something's blank, check the inspector first.
3. **The ARIA trap.** Change the toggle to `data-attr:aria-expanded="$open"`. → When closed, the attribute is **missing**. When open, it's `aria-expanded=""`. Neither is valid ARIA.
4. **Strings join, numbers add.** Add `<p data-text="$qty + $price"></p>` to the totals demo and change Quantity to 3. → You get `18`. Now change the signals to `signals({ qty: '2', price: '15' })` and do it again. → You get `315`.
5. **Key and value.** Change the Broken input's `data-bind:userName=""` back to `data-bind:userName` (no value). → The console shows `KeyAndValueProvided`.

## Check yourself

<details>
<summary>Where do signals live: on the element, or on the page?</summary>

On the page. Every `data-signals` merges into one store, which is why every demo uses different signal names.
</details>

<details>
<summary>Why does a <code>data-show</code> element need <code>style="display:none"</code>?</summary>

The HTML is visible before Datastar's script runs. The inline style keeps the element hidden until `data-show` takes over.
</details>

<details>
<summary>Why does <code>data-bind:userName</code> bind the wrong signal?</summary>

The HTML parser lowercases attribute names, so Datastar sees `data-bind:username`. Use `data-bind="userName"`.
</details>

<details>
<summary>When does <code>$a + $b</code> join text instead of adding?</summary>

When either signal is a string. `data-bind` keeps the type of the initial value, so seed number fields with numbers.
</details>

## Official docs for this lesson

- Guide: [Reactive signals](https://data-star.dev/guide/reactive_signals) · [Datastar expressions](https://data-star.dev/guide/datastar_expressions)
- Reference, one link per attribute used here: [`data-signals`](https://data-star.dev/reference/attributes#data-signals) · [`data-text`](https://data-star.dev/reference/attributes#data-text) · [`data-on`](https://data-star.dev/reference/attributes#data-on) · [`data-show`](https://data-star.dev/reference/attributes#data-show) · [`data-class`](https://data-star.dev/reference/attributes#data-class) · [`data-attr`](https://data-star.dev/reference/attributes#data-attr) · [`data-bind`](https://data-star.dev/reference/attributes#data-bind) · [`data-computed`](https://data-star.dev/reference/attributes#data-computed) · [`data-json-signals`](https://data-star.dev/reference/attributes#data-json-signals)
- Behind the gotchas: [Attribute casing](https://data-star.dev/reference/attributes#attribute-casing) (Step 6) · [the CSS cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade) (Step 7) · [`aria-expanded`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded) (*Break it #3*)
- More reading: [RESOURCES.md](../RESOURCES.md)

---

**Next:** [Lesson 2 — Actions + swap by id](02-actions.md). The server joins in.
