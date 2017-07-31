define(function(require, exports, module) {
    main.consumes = ["Plugin", "language","settings"];
    main.provides = ["ccomplete"];
    return main;
    
    //this function runs once as the ide starts. Responsible for setting plugin's load/unload behavior
    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var plugin = new Plugin("CS50.net", main.consumes);
        var language = imports.language;
        var settings = imports.settings;
        
        //'import' the raw data about each function
        //function_details holds the raw data about each function we want to show up in the autocmplete suggestions
        var function_details=[
          {
            "signature": "int isalnum(int c);",
            "library_name": "ctype",
            "return_value": "`isalnum` returns a nonzero integer if it is either numeric or alphabetic (e.g. '1' or 'D') and zero if it is neither (e.g. '['). Note that C treats 0 as false and 1 as true; as such, `isalnum` is easily used in conditional statements.",
            "fun_name": "isalnum",
            "description": "`isalnum` takes a `char` as input and computes whether the character is alphanumeric."
          },
          {
            "signature": "int isalpha(int c);",
            "library_name": "ctype",
            "return_value": "`isalpha` returns a nonzero integer if it is alphabetic (e.g. 'C' or 'S') and zero if it is neither (e.g. '>' or '4'). Note that C treats 0 as false and 1 as true; as such, `isalpha` is easily used in conditional statements.",
            "fun_name": "isalpha",
            "description": "`isalpha` takes a character as input and computes whether the character is alphabetic."
          },
          {
            "signature": "int isblank(int c);",
            "library_name": "ctype",
            "return_value": "`isblank` returns a nonzero integer if it is blank (e.g. ' ' or '  ', that is, space or tab) and zero if it is neither (e.g. 'y' or '}'). Note that C treats 0 as false and 1 as true; as such, `isblank` is easily used in conditional statements.",
            "fun_name": "isblank",
            "description": "`isblank` takes a character as input and calculates whether it is a blank character (space, tab)."
          },
          {
            "signature": "int isdigit(int c);",
            "library_name": "ctype",
            "return_value": "`isdigit` returns a nonzero integer if it is a decimal digit and 0 if it is not. Note that C treats 0 as false and 1 as true; as such, `isdigit` is easily used in conditional statements.",
            "fun_name": "isdigit",
            "description": "`isdigit` takes a character as input and calculates whether it is a digit. N.B.: Since `isdigit` only covers decimal digits, don't use it for hexadecimal digits, such as `A` or `F`!"
          },
          {
            "signature": "int tolower(int c);",
            "library_name": "ctype",
            "return_value": "`tolower` returns the lower case `char` corresponding to the input. However, if the input is not an upper case `char`, the input is simply returned as-is; e.g., `tolower` of `]` would return `]` This does not necessarily hold true outside the range of `unsigned char`.",
            "fun_name": "tolower",
            "description": "`tolower` takes a `char` as input. Beware that behavior is undefined outside of the range of `unsigned char` (0 - 127)!"
          },
          {
            "signature": "int toupper(int c);",
            "library_name": "ctype",
            "return_value": "`toupper` returns the corresponding upper case `char`. However, if the input is not an lower case `char`, the input is simply returned as-is; e.g., `toupper` of `~` would return `~`. This does not necessarily hold true outside the range of `unsigned char`.",
            "fun_name": "toupper",
            "description": "`toupper` takes a `char` as input. Beware that behavior is undefined outside of the range of `unsigned char` (0 - 127)!"
          }
        ];

        
        //massage the raw data to include derived fields that c9 cares about
        function_details.forEach(function(cur_obj){
            cur_obj.id           = cur_obj.fun_name;
            cur_obj.name         = cur_obj.fun_name+"()";
            cur_obj.replaceText  = cur_obj.fun_name+"(^^)";
            cur_obj.icon         ="method";
            cur_obj.meta         = cur_obj.library_name+".h";
            cur_obj.docHead      = cur_obj.signature;
            cur_obj.priority     = 1;
            cur_obj.isContextual = true;
            cur_obj.doc          = '<p>' + cur_obj.description  + '</p>\
                                    <p>' + cur_obj.return_value + '</p>\
                                    <p><a href="https://reference.cs50.net/'+[cur_obj.library_name,cur_obj.fun_name].join("/")+ '" target="_blank">More...</a></p>';
        });
        
        function_details.push(
            {
                id           : 'for',
                name         : 'for',
                replaceText  : 'for (int i=0; i<limit; i++) { \n\t/*code*/\n}',
                meta         : "for loop syntax",
                priority     : 1,
                isContextual : true
            }
        );
        
        function_details.push(
            {
                id           : 'while',
                name         : 'while',
                replaceText  : 'while (/*condition*/) { \n\t/*code*/\n}',
                meta         : "while loop syntax",
                priority     : 1,
                isContextual : true
            }
        );
        
        function_details.push(
            {
                id           : 'do while',
                name         : 'do while',
                replaceText  : 'do {\n\t(/*code*/)\n} while (/*condition*/)',
                meta         : "do-while loop syntax",
                priority     : 1,
                isContextual : true
            }
        );
        
        function_details.push(
            {
                id           : 'if',
                name         : 'if',
                replaceText  : 'if (/*condition*/) {\n\t/*code for when condition is true*/\n} else {\n\t/*code for when condition is false*/\n}',
                meta         : "if statement syntax",
                priority     : 1,
                isContextual : true
            }
        );
        
        
        //helper function defining the data we send to the worker regarding user settngs [i.e. the less/more comfy view]
        function sendSettings(handler) {
            handler.emit("set_comfy_config", {lessComfy: settings.get("user/cs50/simple/@lessComfortable")} );
        }
        
        //helper function defining the data we send to the worker regarding autcomplete suggestions
        function sendAutocompleteData(handler) {
            handler.emit("send_dataset", {suggestion_data:function_details} );
        }
        
        //runs when the plugin is loaded (plugins may load multiple times, e.g. if disabled and re-enabled)
        //  note that most work is done by the 'worker', which runs in a separate thread and implements some
        //  code tooling interface [e.g. defining autocompletion behavior]
        plugin.on("load", function(){
            //sign in our worker code as a language-handling plugin
            language.registerLanguageHandler(
                "plugins/ccomplete.language/worker/ccomplete_handler",
                function(err, handler) {
                    if (err) {
                        return err;
                    }
                    
                    //send over the formatted function data and whether the user
                    //is currently in less/more comfy view
                    sendAutocompleteData(handler);
                    sendSettings(handler);
                    
                    //listen for changes to less/more comfy view and re-send if updated
                    settings.on("write", sendSettings.bind(null, handler), plugin);
                },
                plugin //lets c9 keep track of who owns the handler
            );
        });
        
        //define unload behavior [unregister things, clear global variables]
        plugin.on("unload", function() {
            language.unregisterLanguageHandler("plugins/ccomplete.language/worker/ccomplete_handler");
        });
        
        //register the plugin's name
        register(null, { ccomplete: plugin });
    }
});