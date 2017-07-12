
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

### Philosophy behind the tool ###

In my engineering work, I'm always looking for systems that are *highly debuggable*. These are
systems where it's easy for a human to understand the system, and interactively work with the
system. There's a few properties that make a system debuggable, and one of them is when the
process is *decomposable*. That's when you can take one step, or one area of the code,
and just run it in isolation.

The build tool GNU Make is a great example of a decomposable tool. Every build step is just a shell
command. You can manually run any step yourself just by copying the shell command. Some build
tools don't give you an easy way to just run individual steps.

So along those lines, I like the idea of focusing on shell commands as the unit of testing. Any
test can be run manually in isolation. And unlike a typical testing framework, where different
steps can sometimes interfere with each other because of shared mutable state, separate processes
usually don't interfere with each other (they still can via the filesystem, but anyway, it happens less).

Another nice thing about this test is you're essentially writing many more assertions. Anything
that is printed to stdout becomes an assertion. Compared to a typical unit test framework
where you need to manually write expect().equals() for every piece of data that you want to
assert. Tests like that tend to leave a lot of data unverified.
