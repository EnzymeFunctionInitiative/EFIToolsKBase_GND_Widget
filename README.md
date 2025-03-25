# EFIToolsKBase_GND_Widget

This is a [KBase](https://kbase.us) module generated by the [KBase Software Development Kit (SDK)](https://github.com/kbase/kb_sdk).

You will need to have the SDK installed to use this module. [Learn more about the SDK and how to use it](https://kbase.github.io/kb_sdk_docs/).

You can also learn more about the apps implemented in this module from its [catalog page](https://narrative.kbase.us/#catalog/modules/EFIToolsKBase_GND_Widget) or its [spec file](EFIToolsKBase_GND_Widget.spec).

# Code documentation

Also in this repository is documentation on the widget classes implemented to handle the transformation of SQLite data to JSON, and pass information from the SQLite files to the frontend interface. There is also documentation on the JS functions implemented on the frontend for downloading GND specific files.

- Data Widget documentation
- GND Widget documentation
- JS function documentation

# Setup and test

Add your KBase developer token to `test_local/test.cfg` and run the following:

```bash
$ make
$ kb-sdk test
```

After making any additional changes to this repo, run `kb-sdk test` again to verify that everything still works.

# Installation from another module

To use this code in another SDK module, call `kb-sdk install EFIToolsKBase_GND_Widget` in the other module's root directory.

# Help

You may find the answers to your questions in our [FAQ](https://kbase.github.io/kb_sdk_docs/references/questions_and_answers.html) or [Troubleshooting Guide](https://kbase.github.io/kb_sdk_docs/references/troubleshooting.html).

