
# stdout-test #

*"Stupidly simple testing"*

Stdout-test is a testing tool that runs your process and checks if the stdout is exactly what's expected.

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

Future feature: Regexes in the expected.txt file
