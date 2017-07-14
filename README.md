
# stdout-test #

*"Stupidly simple testing"*

Stdout-test is a testing tool that runs your process and checks if the stdout is exactly what's expected.

### How to use ###

To record a new test, run this:

```
stdout-test --add test-name my-process --xyz
```

This will run `my-process --xyz` in a shell, record all its stdout output, and save everything at `test/test-name/expected.txt`. At that point you can commit the `expected.txt` file to source control and now you have a new test.

To run it, you can run a single test:

```
stdout-test test-name
```

Or just run everything in the `test/` dir:

```
stdout
```

This will re-run the same command and verify that it matches the expected output.

If you make a change to your code, and you know that your process's output will be changed, there's a super quick way to update your test files. Just run

```
stdout --accept
```

This will run the saved tests, and instead of verifying the output, it will just save the new output. At that point you can use source control (such as `git diff`) to visually verify that any changes
are intended, and if so, save the modified test files.


### What do I do if the output is not deterministic? ###

It's common to have issues when a process's output is not exactly the same every time.
This can happen if any random or changing data (like timestamps) is printed, or if any
operations can run in a nondeterministic order.

To address that, here are some options:

 1) Fix the tool to make the output totally deterministic. For some tools I've added an
    `--in-test` command line option, which makes it use hardcoded dates and etc. This
    is more code to write, but it helps in a few ways to make automated testing more rock-solid.

 2) In a future version of stdout-test we'll support regex patterns in the expected.txt file.
