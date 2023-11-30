## JS in TS

#### My greatest mistake

It's often cited that TypeScript's type-system is [turing complete](...). There are a number of great examples illustrating this. However, some abstract turing machine embedded into the type system isn't exactly useful [^1].

Frankly, what's the point of having a type system that's turing complete if you can't write any useful programs in it.

Now, you may agree with this, but it does raise another question. If you were to write a program in your type system, what language would you use? How could you concisely and effectively communicate the nature of your type?

There is of course, only one correct answer to this question.

The types should be written in TypeScript [^2].

## Cut to the Chase

> "Zach, what did you do?"

Ok so before I say anything further, you should bear in mind that this is just a small subset of valid TypeScript (or really, just JavaScript).

But! At the same time:

```typescript
import { Eval } from "jsits";

const factorial = <N extends number>(limit: N): Eval<`
    (limit) => {
        let rec = (val) => {
            if (val > limit) {
                return 1;
            }

            return val * rec(val + 1);
        };

        return rec(1);
    }
`, [N]> => {
    let rec = (val: number) => {
        if (val > limit) {
            return 0;
        }

        return val * rec(val + 1);
    };

    return rec(1) as any;
}

const resultGood: 720 = factorial(6);
```

## FAQ

I'm **positive** you want to hear the full disgusting details of how this was implemented. But for those who want the tl;dr, here's a quick overview:

> "Does this actually work, or is it just a gimmick?"

This is definitely just a gimmick. But, I committed to the bit. JSiTS is an end-to-end JavaScript interpreter implemented 100% in TS' type system.

> "Wait, like a proper compiler?"

Sort of? It's got a tokenizer, lexer, parser, and interpreter. With that said, it's interpreted not compiled and nothing about it is proper.

> "How much of the ECMAScript spec does it support?"

🤣🤣🤣

Look we's gotst numbers, strings, booleans, and the occasional undefined. If you're feeling spicy, we'll even throw in first-class functions for ya. We have a few mathematical operations and some comparisons and uh &mdash; well yeah that's about it.

> "That doesn't sound very useful."

Oh what, and adding for loops would suddenly fix that?

> "Well, probably not, but it seems important."

Ok look I've already spent waaaayyy too much time on this (like at least 4 hours). Feel free to add all the for loops you want!

> "That's so cool!!! Please give me the full technical details of exactly how you implemented it!!!!"

Thanks kid. Here's the $20 now scram.

## Details

At a high-level, this project is an incredibly straightforward interpreter &mdash; only implemented in a type system. The rough procedure is as follows:

1. Given a string, we begin by tokenizing it into discrete strings.
2. Given those tokens, we lex them to match them to their respective token types. For instance `(` would become `open-paren` and `"hello world"` would get tokenized as a string.
3. Once we've finished lexing, we parse the tokens into an AST via a vaguely-LR1 style parser.
4. Given a parsed AST, we can interpret the code (optionally with external parameters applied).

However, the naive approach is too inefficient to be practical. The initial implementation wasn't even able to parse small programs in time.

If you're interested, the code is fairly short and you can see the approach I took. There are still a lot of optimizations that would be needed to make this at all effectual. With that said, let me go through them in a bit of detail

### Tokenizer

This step is usually ommitted from most compilers. In any sensible language, you can use regular expressions to both lex and tokenize the input string at the same time. Since we have no such luxuries, we instead tokenize the string character by character.

The tokenizer uses an approach that you'll see often throughout the code wherein a recursive type (`Tokenize` in this case) that builds up an accumulator as it process its input.

This type steps through the string and adds each character to the current token. If it detects a word break or a special character, it adds the current word to the word stream.

The only issue with this approach is that tokenizing multi-character operators is hard. The algorithm as described above would tokenize `"<="` as `["<", "="]`. To solve this, we implement a `MaximallyTokenizeOPerator` function that allows the tokenizer to see if appending the current token would produce a valid operator (thus allowing us to correctly tokenize e.g. `x++<1` as `["x", "++", "<", "1"]`[^3][^4]).

This ends up giving us a stream of tokens that we can start to lex.

### Lexer

Once we've implemented the tokenizer, the lexer is pretty easy. We have a map of tokens whose keys are format string types that match the token, and the values are the keys we'll use in the parser.

Although we don't have regular expressions, we can do some pattern matching using format string types. For instance, an example key in that object is

```ts
export type Values = {
    [K: `"${string}"`]: "string",
    [K: `'${string}'`]: "string",
    // ...
}
```

This allows us to intelligently match our tokens against our desired structures.

However, it might be worth taking a step back now that we have some complexity to understand the difference between types, values, and the representation of data in our weird machine.

#### &tilde;&tilde;&tilde; A short digression &tilde;&tilde;&tilde;

In the previous section, I mentioned that we had a type whose output is list of tokens. If you haven't dealt in the dark TypeScript arts before, this might be a bit confusing. TypeScript's type system is pretty expressive, and allows you to specify "literal" types, such as

```ts
type LiteralString = "this is the only allowed string";

// Good
let x: LiteralString = "this is the only allowed string";

// Error
let y: LiteralString = "this is not an allowed string";
```

Likewise, TypeScript has a notion of "tuples", essentially lists of finite length whose types are distinct at each element. When you combine the two, you can make tuples of literals that look an _awful_ like arrays of strings:

```ts
type ConfuseYourself = ["this", "is", "just", "a", "type"];
```

The tokenizer manufactures a type of this form by continually appending to a tuple like this:

```ts
type Initial = ["first", "second"]
type Updated = [...Initial, "third"] // equivalent to ["first", "second", "third"];
```

At this point, you're probably asking &mdash; are these types or are they values.

I mean, *obviously* they're types. Just look at that `type` keyword [^5]. However, given that we're writing complex code in the type system, it might be worth re-orienting our mental model up a universe. If we do this, then these types become values.

Ok sorry sorry, back to your regularly scheduled programming.

### Parser

The parser is where things start to get interesting. We define a a flat AST structure called `ParseTree`. It makes no attempt to contextualize tokens, instead serving as a generic type for partially-reduced data. We then implement our `parse` function which creates a single `ParseTree` representing the input program.

#### Type Confusion

Now if you buy my previous statement about re-orienting our mental model such that types become values, then we're in a pickle.

We have this type called `ParseTree`. At the same time, we need to create types that are actually values of type `ParseTree`. But if we've lifted types into values, then how can a value be typed by a different value 😵‍💫😵‍💫😵‍💫

Mentally, we actually start to impose a distinction between the two. Some types are values in our weird machine, some types are actually types. In normal, sane-person TypeScript[^6] we use this syntax to show some value has some type: `value: Type`. In our weird elevated TypeScript we'll do `Value extends Type`.

This requires us to keep track of what's actually a type versus what's really a value, but lets us enforce that our funky type-value-thingies adhere to a certain structure.

Here's an example of that

```ts
// This one is acting as a type in our elevated universe
type ListType = {
    value: string,
    next: ListType | undefined,
};

// This one is acting as a value
type ListValue = {
    value: "first",
    next: {
        value: "second",
        next: undefined,
    }
};

// Here's how we can enforce the typing behavior (known as assignability)
type PrintList<Input extends ListType> = ...;

// And now we can invoke our function on that value to get a new value
type Result = PrintList<ListValue>
```
[^7]

Our parser makes use of this by both defining a `ParseTree` type, and then a `Parse` function which creates a specific instance of that type that encodes the structure of the AST.

#### Baby's first Parser

To do this, it makes heavy use of the `infer` keyword.

This little bit of magic is the crux of our oepration. Contrary to what the term might suggest, it's less about doing type inference and more about deconstructing a complex type. Let's say we have a tuple. If the first element is a string literal, we can use the `infer` keyword to pull it out. That would look something like this:

```ts
type GetFirstString<Input extends any[]> =
    Input extends [infer FirstElement extends string, ...any[]] ?
        FirstElement :
        "First element is not a string!";

type Res = GetFirstString<["hello", 123]>; // "hello"
```

In a normal shift-reduce parser, we would check for a structure using some bespoke syntax that's vaguely (what do you call this again?)-like:

```
let stmt =
    DECL_WORD <t: token> EQUALS_SIGN <e: expression> SEMICOLON =>
        { kind: "assignment", variable: t, value: e }
    OPEN_BRACE <l: stmt_list> CLOSE_BRACE =>
        { kind: "block", values: l }
    ...
    ;

let stmt_list =
    <l: stmt_list> <s: stmt> => l.concat(s)
    <s: stmt> => [s]
    ;
```

Since we have no fancy compiler-generators here, we build our own as a long and explicit shift-reduce chain using infers. The above parser could look something like this:

```ts
type Parse<Tokens extends string[], ShiftRegister extends ParseTree[]> =
    ShiftRegister extends [
        // It's a stack so we look downward
        { kind: "decl-word" },
        { kind: "token", value: infer Name extends string },
        { kind: "equals" },
        { kind: "expression", value: infer Value extends ParseTree },
        { kind: "semicolon-word" },
        ...Rest extends ParseTree[]
    ] ? Parse<
        Tokens,
        [{ kind: "assignment", variable: Name, value: Value }, ...Rest]
    > :

    ShiftRegister extends [
        { kind: "open-brace" },
        { kind: "statement-list", values: infer Values extends ParseTree[] },
        { kind: "close-brace" },
        ...Rest extends Parsetree[]
    ] ? Parse<
        Tokens,
        [{ kind: "block", values: Values }, ...Rest]
    > :

    ShiftRegister extends [
        { kind: "statement", value: infer Value extends ParseTree },
        { kind: "statement-list", values: infer Values extends ParseTree[] },
        ...Rest extends ParseTree[]
    ] ? Parse<
        Tokens,
        [{ kind: "statement-list", values: [Value, ...Values] }]
    > :

    ShiftRegister extends [
        { kind: "statement", value: infer Value extends ParseTree },
        ...Rest extends ParseTree[]
    ] ? Parse<
        Tokens,
        [{ kind: "statement-list", values: [Value] }]
    > :

    ...
```

Verbose, isn't it? However, with a little bit of work you should be able to see how the former translates to the latter.

One caveat worth mentioning however is the flattening of `stmt` and `stmt_list` types. Internally, any parser-generator is going to be doing the same thing, but we need to be explicit in doing it ourselves. A minor nuisance, but nothing too hard to deal with.

#### Because Performance Matters™️

The other thing to notice is the constant deconstruction of the input using `infer`s. In order to make any kind of reduction, we need to first pull out the parts we care about, as well as everything else (via `Rest`), and then recombine them in the new structure we want. This is because effectively we're working with purely immutable values types.

However, this means that every step in the parsing process is not just inefficient because of the $$O(\exp{n}{2})$$ deconstruction and reconstruction of the shift register, but also the constant destructuring which must also check that each component is of a given type.

As it turns out, the constant ternary chain of `infer`s is _reallllllly_ inefficient. So much so that I was struggling to parse 7 line programs. To speed this up, we delay the `infer` until after we've done a structural match. For the `block` case, that would look like:

```ts
    ShiftRegister extends [
        { kind: "open-brace" },
        { kind: "statement-list", },
        { kind: "close-brace" },
        ...any[]
    ] ?
    ShiftRegister extends [
        { kind: "open-brace" },
        { kind: "statement-list", values: infer Values extends ParseTree[] },
        { kind: "close-brace" },
        ...Rest extends Parsetree[]
    ] ? Parse<
        Tokens,
        [{ kind: "block", values: Values }, ...Rest]
    > :
    never :
```

Disgusting? Yes. Verbose? Yes. Efficient? Close enough 😅

#### Operator Precedence

Here's something else fun &mdash; operator precedence. Given that we're implementing a basic shift-reduce parser, we need to consider the following case

```
Shift Register Stack = [Expression, Operator1, Expression, ...];
Token Stack = [Operator2];
```

When we encounter this condition, we compare the precedences of `Operator1` and `Oeprator2`. If the latter has strictly higher precedence, then we shift it in. Otherwise we reduce `Operator1`.

To compare precedences, we do a very stupid check. An `OperatorPrecedences` type is constructed where the keys are the operators, and the values are objects whose keys go from "1" to "4" (with the value true). The fewer keys the object has, the higher the precedence.

This way, we can do a basic assignability check to determine which operator has higher precedence. I.e.

```ts
type OperatorPrecedences = {
    "*":   { "1": true },
    "/":   { "1": true },
    "+":   { "1": true; "2": true },
    "-":   { "1": true; "2": true },
}

// Does + have higher (or equal) precedence to *?
type PlusIsHigher = OperatorPrecedences["+"] extends OperatorPrecedences["*"] ?
    true :
    false;
```

With this done, we can fully parse our program.

### Interpretation

Whew! Maybe this would be a good time to take a break, grab some coffee. While you're up actually, would you mind grabbing me some banana bread?

Perfect, now how do we "run" this program?

At this point, we basically have all the techniques we need to implement our execution. At a high level, we start reducing our statements one by one, creating a context object that holds variables and the current control-flow state.

Each statement updates the object, and when we hit a return we abort the control flow and "return" from our accumulator.

At the same time, we implement a type that can evaluate expression based off of the context object constructed this far.

A cool example of this is the conditional case (for `if` statements)

```ts
Stmt extends [
        { kind: "conditional" },
        ...any[]
    ] ?
    Stmt extends [
        {
            kind: "conditional",
            condition: infer Condition extends ParseTree,
            body: infer Body extends ParseTree
        },
        ...infer Rest extends ParseTree[]
    ] ?
        IsTruthy<ExecuteExpressionMasked<Condition, C>> extends true ?
            ExecuteStatementsMasked<[Body, ...Rest], C> :
            ExecuteStatementsMasked<Rest, C> :
    never :
```

As before, we start by matching the structure of the statement, and then pull our the details.

Once we're ready to evaluate, we evalute the expression to a concrete value, and then use a handy `IsTruthy` type function to determine if the value is, well, truthy.

In the case it has, then we recursively continue executing our statements, starting with the body of the `if`, and then everything else. If the condition fails, then we just continue executing everything else.

On the expression execution, the only really interesting bits are the operators. Those however are a whole beast unto themselves.

#### Quick Maffs

How do we implement the operators we have (`*` `+`, `<`, `>`, `===`)? The answer is "painfully". Each of these operators are bespoke (although some build atop others). Furthermore, they're all being operated on as strings!.


As an example, we can go over the `Add` function (actually called `BigAdd` in the code). This function works by doing the following:

1. Stringify both numeric inputs
2. Turn those strings into arrays of digits
3. Go digit by digit along the two arrays, and do a simple add with carry on the digits
4. Recursively add the remaining components, along with the carry

This implementation requires as a primitive a single-digit add with carry. This is implemented separately as a **unary addition**!!

For both the digits, we construct an array of that length, then concatenate the two of them and fetch the length of the result. This can then be deconstructed into a least digit and a carry.

#### Limitations

One limitation of how the execution environment works is that expressions are necessarily pure. Since the context is dragged through the reduction via the statement lists, it can't be updated by invoking functions. Thus, if you define a function that updates a variable in the parent scope, it will only see it inside the function and not out.

However, the bigger limitation is that our reduction is recursive. Additionally, our expression evalute their entire tree recursively (including function calls). This means that we fairly quickly run into the infamous "type instantiation is excessively deep and possibly infinite" error.

Early versions encountered this even before trying to run programs, just in the definition of `EvaluateExpression` itself.

The reason for this is that TypeScript is trying to determine for recursive types whether the return type of all branches adheres to the constraints imposed on it (in this case, the the return type is assignable to `Value`). This check itself is pretty challenging, and the compiler gives up pretty quickly.

However, we can solve this by cutting off the check. We split `ExecuteExpression` into two pieces, the existing execution function and `ExecuteExpressionMasked`. The latter invokes the former sight-unseen, and if the return value is assignable to `Value`, returns it, otherwise returns `never`.

Now, as long as `ExecuteExpression` recursively invokes the `Masked` variant, TypeScript only needs to ensure that the latter function returns a `Value`, which is much easier since it only has one case.

## Putting it all together

Ok so we have our four stage compiler. What can we do with it?

The answer sadly is... not much. The only way we can loop is with recursion, and our recursive depth is limited to about 8 before we get a timeout.

However, we can still demonstrate some cool proof of concepts. One fun example is the factorial example given earlier. A cooler one however is this.

```ts
type PlusDistributes = Eval<`
    (x, y) => {
        return x + y;
    }
`, [
    1 | 2,
    3 | 4,
]>
```

In normal TypeScript we can have a value whose type is `1 | 2`. In our meta language we can have a value whose **value** is `1 | 2`. This means our program can operate over multiple parallel universes at once‼️

Even still, this is very much just a proof of concept and not a real tool for actual use.

More than that, it can be a fun way to learn about the intracacies of the TypeScript type system, and offer a playground for doing whacky things with it.

If you want to play around with it further, feel free to add features and open PRs! Otherwise, let me know what you think about it.


----

1: Oh what, and this is?
2: Well ok, JavaScript. Let's not get ahead of ourselves here.
3: You know, if we bothered implementing `++`.
4: Wait ok there's a catch, did you notice it? We can correctly tokenize `===` because `==` is a valid token. If we only allowed `=` and `===` we would instead tokenize this as `["=", "=", "="]`. We could probably make this work by having the `MaximallyTokenizeOperator` look at prefixes, but that would be slower and I'm lazy.
5: Kinda spoils the surprise tbh.
6: Hey! No jokes about all TypeScript devs being insane. We know.
7: Once you've finished reading this, try implementing `PrintList`! Hint, you'll probably want to adjust the signature a bit.