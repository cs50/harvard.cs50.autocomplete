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
        var function_details=JSON.parse(require("text!./function_details.json"));

        
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