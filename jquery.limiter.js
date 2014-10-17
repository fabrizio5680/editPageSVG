/**
 * This plugin limits input text width by its dimensions or defined width
 * @author Bobr (http://bobrosoft.com)
 */
(function($) {
    $.fn.limiter = function(options) {
        // Default settings
        var options = $.extend({
            width: null
        }, options);
        
        // Create hidden span, if no created yet
        var span = $.fn.limiter.span;
        
        if (!span) {
            span = $('<span></span>');
            $.fn.limiter.span = span;
            span.css({
                visibility: 'hidden',
                position: 'absolute',
                left: 0,
                top: 0,
                'white-space': 'pre'
            });
            
            $('body').first().after(span); //Switched to body because of bug in iOS 5.0.1 and older
        }
        
        return this.each(init);
        
        function init()
        {
            var base = $(this);
            base.keypress(onKeyPress);
            
            this.getAsLines = getAsLines;
        }
        
        function isStringExceedsBoundary(str, context)
        {
            var base = $(context || this);
            
            // Apply CSS
            span.css({
                'font-family': base.css('font-family'),
                'font-size': base.css('font-size'),
                'font-style': base.css('font-style'),
                'font-variant': base.css('font-variant'),
                'font-weight': base.css('font-weight'),
                'letter-spacing': base.css('letter-spacing'),
                'text-indent': base.css('text-indent'),
                'text-transform': base.css('text-transform'),
                'word-spacing': base.css('word-spacing')
            });
            
            span.text(str);
            
            return span.width() >= (options.width ? options.width : base.width()) * 0.95;
        }
        
        function getAsLines()
        {
            var base = $(this);
            var message = base.val();
            var newLineIndex = 0;
            var lastSpaceIndex = -1;
            var lines = [];
            
            // Go throught the message and split it
            for (var i = 0; i < message.length; i++) {
                // Check, if that's new line
                if (message[i] == '\n') {
                    lines.push(message.substring(newLineIndex, i));
                    lastSpaceIndex = i;
                    newLineIndex = i + 1;
                    continue;
                }
                
                // Check, if limit already reached
                if (isStringExceedsBoundary(message.substring(newLineIndex, i), base)) {
                    if (!lastSpaceIndex) {
                        lastSpaceIndex = i;
                    }
                    
                    lines.push(message.substring(newLineIndex, lastSpaceIndex));
                    newLineIndex = lastSpaceIndex + 1;
                }
                
                // Remember last space index
                if (message[i] == ' ') {
                    lastSpaceIndex = i;
                }
            }
            
            // Add last string
            lines.push(message.substring(newLineIndex, i));
            
            return lines;
        }
        
        function onKeyPress(e)
        {
            var base = $(e.target);
            
            // Limit the text if needed
            if (base.is('input')) {
                if (isStringExceedsBoundary(base.val() + String.fromCharCode(e.keyCode), base)) {
                    //e.target.setAttribute('maxlength', e.target.value.length);
                    if ([9, 46].indexOf(e.keyCode) == -1) { // allow only Backspace and Del
                        e.preventDefault();
                    }
                } else {
                    //e.target.setAttribute('maxlength', '');
                }
            }
        }
    };
})(oQuery);
