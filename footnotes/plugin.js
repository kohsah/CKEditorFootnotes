/**
 * Basic sample plugin inserting footnotes elements into CKEditor editing area.
 *
 * Version 1.0.9
 * https://github.com/andykirk/CKEditorFootnotes
 *
 */
// Register the plugin within the editor.
(function($) {
    "use strict";



    CKEDITOR.plugins.add( 'footnotes', {

        footnote_ids: [],
        requires: 'widget',
        icons: 'footnotes',


        // The plugin initialization logic goes inside this method.
        init: function(editor) {

            // Check for jQuery
            // @TODO - remove if/when JQ dep. is removed.
            if (typeof(window.jQuery) == 'undefined') {
                console.warn('jQuery required but undetected so quitting footnotes.');
                return false;
            }

            // Allow `cite` to be editable:
            CKEDITOR.dtd.$editable['cite'] = 1;

            // Add some CSS tweaks:
            var css = '#footnotes-container{background:#eee; padding:1px 15px;} .footnotes cite{font-style: normal;}';
            CKEDITOR.addCss(css);

            var $this = this;

             editor.on('change', function(evt) {
                console.log(" ON CHANGE CALLED !!!");
                setTimeout(
                    function(){
                        $this.renumberMarkers(editor)
                    },
                    0
                );
             });

            /*editor.on('saveSnapshot', function(evt) {
                console.log('saveSnapshot');
            });*/

            // Force a reorder on startup to make sure all vars are set: (e.g. footnotes store):
            // __COMMENT__ !+(AH, 2017-04-08)
            editor.on('instanceReady', function(evt) {
                setTimeout(function() {
                    $this.renumberMarkers(editor);
                });
            });

            // Register the footnotemarker widget.
            editor.widgets.add('footnotemarker', {

                // Minimum HTML which is required by this widget to work.
                requiredContent: 'sup[data-footnote-id]',

                // Check the elements that need to be converted to widgets.
                upcast: function(element) {
                    return element.name == 'sup' && typeof(element.attributes['data-footnote-id']) != 'undefined';
                },
            });

            // Define an editor command that opens our dialog.
            editor.addCommand('footnotes', new CKEDITOR.dialogCommand('footnotesDialog', {
                // @TODO: This needs work:
                allowedContent: 'section[*](*);header[*](*);li[*];a[*];cite(*)[*];sup[*]',
                requiredContent: 'section[*](*);header[*](*);li[*];a[*];cite(*)[*];sup[*]'
            }));

            // Create a toolbar button that executes the above command.
            editor.ui.addButton('Footnotes', {

                // The text part of the button (if available) and tooptip.
                label: 'Insert Footnotes',

                // The command to execute on click.
                command: 'footnotes',

                // The button placement in the toolbar (toolbar group name).
                toolbar: 'insert'
            });

            // Register our dialog file. this.path is the plugin folder path.
            CKEDITOR.dialog.add('footnotesDialog', this.path + 'dialogs/footnotes.js');
        },


        build: function(footnote, is_new, editor) {
            var footnote_id;
            var the_this = this;
            console.log(" build = ", footnote, is_new, editor);
            if (is_new) {
                // Generate new id:
                footnote_id =  the_this.randomString(); 
            } else {
                // Existing footnote id passed:
                footnote_id = footnote;
            }
            var marker_id = "fnm_" + footnote_id;
            // Insert the marker:
            var footnote_marker = '<sup id="' + marker_id + '" data-footnote-id="' + footnote_id + '">X</sup>';
            
            editor.insertHtml(footnote_marker);
            
            if (is_new) {
                editor.fire('lockSnapshot');
                console.log(" addFootNote = ", footnote_id, fnote);
                var fnote = the_this.buildFootnote(footnote_id, footnote, false, editor);
                the_this.addFootnote(fnote, editor);
                editor.fire('unlockSnapshot');
            }
            setTimeout(
                function() {
                    the_this.renumberMarkers(editor);
                }
            );
        },

        renumberMarkers: function(editor) {
            editor.fire('lockSnapshot');
            // if there are no <sups> delete the footnotes container
            var $contents = $(editor.editable().$);
            var editor_id = editor.element.$.id;
            var $markers = $contents.find('sup[data-footnote-id]');
            // If there aren't any, remove the Footnotes container:
            var $fns_container = $('#footnotes-container div[data-for="' + editor_id + '"]');
            var $fns = $("ol", $fns_container);
            if ($markers.length == 0) {
                $fns.remove();
                //$contents.find('.footnotes').parent().remove();
                editor.fire('unlockSnapshot');
                return;
            } else {
                // if there are markers .. find their order 
                // we set the number into the markers which were set as 'X'
                var marker_order = [];
                for (var i=0; i < $markers.length; i++ ) {
                    var $marker = $($markers[i]);
                    var fn_id = $marker.data("footnote-id");
                    marker_order.push(fn_id);
                    $marker.html('<a href="#fn_' + fn_id + '">'+ (i+1) + '</a>');
                }
                // rebuild footnotes list 
                var fns_new_order = []; 
                console.log(" MARKER ORDER = ", marker_order);
                for (var i=0; i < marker_order.length; i++ ) {
                    var marker_id = marker_order[i];
                    var $the_footnote = $("li[data-footnote-id='" +  marker_id + "']", $fns);
                    if ($the_footnote.length > 0) {
                        fns_new_order.push($the_footnote[0].outerHTML);
                    }
                }
                // remove old footnotes
                $('li', $fns).remove();
                // set new footnotes
                $fns.append(fns_new_order.join(""));
                editor.fire('unlockSnapshot');
                return;
            }

            editor.fire('unlockSnapshot');
        },


        buildFootnote: function(footnote_id, footnote_text, data, editor) {
            var links   = '',
                footnote,
                letters = 'abcdefghijklmnopqrstuvwxyz';
               
            var footnote_content_id = "fn_" + footnote_id;
            footnote = 
                '<li id="' + footnote_content_id + '" data-footnote-id="' + footnote_id + '">' + 
                   '<p style="display:inline" contenteditable="true">' + footnote_text + '</p>';
                '</li>';
            console.log(" FOOT NOTE = ", footnote);
            return {"element": footnote, "for_content_id": footnote_content_id, "id":  footnote_id };
        },

        addFootnote: function(footnote, editor) {
            //var $contents  = $(editor.editable().$);
            var $footnotes_container = $("#footnotes-container");
            var $footnote_parent_id = editor.element.$.id;
            var $footnotes = $footnotes_container.find("div[data-for='" + $footnote_parent_id + "'] ol");
            var footnote_embed = '';
            if ($footnotes.length === 0 ) {
                var $footnote_holder = $('<div data-for="' + $footnote_parent_id + '" ><ol/></div>');
                $footnote_holder.find("ol").append(footnote.element);
                $footnotes_container.append($footnote_holder);
            } else {
                $footnotes.append(footnote.element);
                footnote_embed = footnote;
            }
        },

        randomString: function() {
            var N_LENGTH = 7;
            return (Math.random().toString(36)+'00000000000000000').slice(2, N_LENGTH + 2);
        }
       
    });
}(window.jQuery));
