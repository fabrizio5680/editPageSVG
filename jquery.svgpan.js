/**
 * Based on the SVGPan library v1.2.2 of Andrea Leofreddi <a.leofreddi@itcharm.com>
 * Required: jquery.js, jquery.svg.js, jquery.svgdom.js
 * @author Bobr (http://bobrosoft.com)
 */

/** 
 *  SVGPan library 1.2.2
 * ======================
 *
 * Given an unique existing element with id "viewport" (or when missing, the 
 * first g-element), including the the library into any SVG adds the following 
 * capabilities:
 *
 *  - Mouse panning
 *  - Mouse zooming (using the wheel)
 *  - Object dragging
 *
 * You can configure the behaviour of the pan/zoom/drag with the variables
 * listed in the CONFIGURATION section of this file.
 *
 * Known issues:
 *
 *  - Zooming (while panning) on Safari has still some issues
 *
 * Releases:
 *
 * 1.2.2, Tue Aug 30 17:21:56 CEST 2011, Andrea Leofreddi
 *	- Fixed viewBox on root tag (#7)
 *	- Improved zoom speed (#2)
 *
 * 1.2.1, Mon Jul  4 00:33:18 CEST 2011, Andrea Leofreddi
 *	- Fixed a regression with mouse wheel (now working on Firefox 5)
 *	- Working with viewBox attribute (#4)
 *	- Added "use strict;" and fixed resulting warnings (#5)
 *	- Added configuration variables, dragging is disabled by default (#3)
 *
 * 1.2, Sat Mar 20 08:42:50 GMT 2010, Zeng Xiaohui
 *	Fixed a bug with browser mouse handler interaction
 *
 * 1.1, Wed Feb  3 17:39:33 GMT 2010, Zeng Xiaohui
 *	Updated the zoom code to support the mouse wheel on Safari/Chrome
 *
 * 1.0, Andrea Leofreddi
 *	First release
 *
 * This code is licensed under the following BSD license:
 *
 * Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com>. All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 * 
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Andrea Leofreddi.
 */

"use strict";

(function($) {
    $.fn.svgpan = function(options) {
        
        if (options == 'destroy') {
            return this.each(destroy);
        }
        
        // Default settings
        var options = $.extend({
            enablePan: true
            , enableZoom: true
            , enableRotate: true
            , enableDrag: false
            , zoomScale: 0.2 // Zoom sensitivity
            , currentZoom: 1 // If you use not default size of webview or SVG
            , currentOffset: {x: 0, y: 0} // If you use not default offsets
        }, options);
        
        // Get root SVG document element
        var root = this.first().get(0).ownerSVGElement;
        var svgRoot = this.first().get(0);
        var state = 'none', stateTarget, stateOrigin, stateTf, lastPoint, gestureInitScale, gestureInitRotation;
        
        init();
        svgRoot.svgpanDestroy = destroy;
        return this.first(); // Only one now
        
        function init()
        {
            // Cleanup viewBox
            var t = svgRoot;
            while(t != root) {
                if(t.getAttribute("viewBox")) {
                    setCTM(svgRoot, t.getCTM());
                    t.removeAttribute("viewBox");
                }
                t = t.parentNode;
            }
            
            // Setup handlers
            var touch_support = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (touch_support) {
                // Bind manually, because jQuery do it wrong
                svgRoot.addEventListener("touchstart", handleMouseDown, false);
                svgRoot.addEventListener("touchmove", handleMouseMove, false);
                svgRoot.addEventListener("touchend", handleMouseUp, false);
                svgRoot.addEventListener("gesturestart", handleGestureStart, false);
                svgRoot.addEventListener("gesturechange", handleGestureChange, false);
                svgRoot.addEventListener("gestureend", handleGestureEnd, false);
            } else {
                $(svgRoot).mousedown(handleMouseDown)
                    .mousemove(handleMouseMove)
                    .mouseup(handleMouseUp);
                    
                if(navigator.userAgent.toLowerCase().indexOf('webkit') >= 0)
                    window.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
                else
                    window.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
            }
        }
        
        /**
         * Instance an SVGPoint object with given event coordinates.
         */
        function getEventPoint(evt) {
            var p = root.createSVGPoint();
            
            if (!evt.touches) {
                p.x = evt.clientX;
                p.y = evt.clientY;
            } else {
                p.x = evt.touches[0].pageX;
                p.y = evt.touches[0].pageY
                
                // Find center point for multitouch
                if (evt.touches.length > 1) {
                    p.x = (p.x + evt.touches[1].pageX) / 2;
                    p.y = (p.y + evt.touches[1].pageY) / 2;
                }
            }

            if (options.scale === undefined || options.scale === null) {
                options.scale = 1;
            }

            // Apply correctional coefficients
            p.x = p.x * (1 / ((options.currentZoom + options.scale) - 1)) + options.currentOffset.x;
            p.y = p.y * (1 / ((options.currentZoom + options.scale) - 1)) + options.currentOffset.y;
            
            lastPoint = p;
            return p;
        }

        /**
         * Sets the current transform matrix of an element.
         */
        function setCTM(element, matrix) {
            var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
        
            element.setAttribute("transform", s);
        }
        
        /**
         * Dumps a matrix to a string (useful for debug).
         */
        function dumpMatrix(matrix) {
            var s = "[ " + matrix.a + ", " + matrix.c + ", " + matrix.e + "\n  " + matrix.b + ", " + matrix.d + ", " + matrix.f + "\n  0, 0, 1 ]";
        
            return s;
        }
        
        /**
         * Sets attributes of an element.
         */
        function setAttributes(element, attributes){
            for (var i in attributes)
                element.setAttributeNS(null, i, attributes[i]);
        }
        
        
        /**
         * Handle mouse move event.
         */
        function handleMouseMove(evt) {
            if(evt.preventDefault)
                evt.preventDefault();
            
            // Prevent move when pinch/zoom 
            if (evt.touches && evt.touches.length > 1) {
                return;
            }
        
            evt.returnValue = false;
        
            var g = svgRoot;
        
            if(state == 'pan' && options.enablePan) {
                // Pan mode
                var p = getEventPoint(evt).matrixTransform(stateTf);
        
                setCTM(g, stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y));
            } else if(state == 'drag' && options.enableDrag) { //This part is fully untested because not used
                // Drag mode. This part is fully untested and can contain bugs
                var p = getEventPoint(evt).matrixTransform(g.getCTM().inverse());
        
                setCTM(stateTarget, root.createSVGMatrix().translate(p.x - stateOrigin.x, p.y - stateOrigin.y).multiply(g.getCTM().inverse()).multiply(stateTarget.getCTM()));
        
                stateOrigin = p;
            }
        }
        
        /**
         * Handle click event.
         */
        function handleMouseDown(evt) {
            if(evt.preventDefault)
                evt.preventDefault();
        
            evt.returnValue = false;
        
            var g = svgRoot;
        
            if(
                evt.target.tagName == "svg" 
                || !options.enableDrag // Pan anyway when drag is disabled and the user clicked on an element 
            ) {
                // Pan mode
                state = 'pan';
        
                stateTf = g.getCTM().inverse();
        
                stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
            } else {
                // Drag mode
                state = 'drag';
        
                stateTarget = evt.target;
        
                stateTf = g.getCTM().inverse();
        
                stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
            }
        }
        
        /**
         * Handle mouse button release event.
         */
        function handleMouseUp(evt) {
            if(evt.preventDefault)
                evt.preventDefault();
        
            evt.returnValue = false;
        
            if(state == 'pan' || state == 'drag') {
                // Quit pan mode
                state = '';
            }
        }
        
        /**
         * Handle mouse wheel event.
         */
        function handleMouseWheel(evt) {
            if(!options.enableZoom)
                return;
        
            if(evt.preventDefault)
                evt.preventDefault();
        
            evt.returnValue = false;
        
            var delta;
        
            if(evt.wheelDelta)
                delta = evt.wheelDelta / 360; // Chrome/Safari
            else
                delta = evt.detail / -9; // Mozilla
        
            var z = Math.pow(1 + options.zoomScale, delta);
        
            var g = svgRoot;
            
            var p = getEventPoint(evt);
        
            p = p.matrixTransform(g.getCTM().inverse());
        
            // Compute new scale matrix in current mouse position
            var k = root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);
        
                setCTM(g, g.getCTM().multiply(k));
        
            if(typeof(stateTf) == "undefined")
                stateTf = g.getCTM().inverse();
        
            stateTf = stateTf.multiply(k.inverse());
        }
        
        function handleGestureStart(evt) {
            var m = svgRoot.getCTM();
            gestureInitScale = Math.sqrt(m.a*m.a + m.b*m.b);
            gestureInitRotation = Math.atan2(m.b, m.a) * (180 / Math.PI);
        }
        
        function handleGestureChange(evt) {
            if (evt.preventDefault) {
                evt.preventDefault();
            }
            
            var g = svgRoot;
            var p = lastPoint;
            p = p.matrixTransform(g.getCTM().inverse());
        
            // Compute new scale matrix in current mouse position
            var k = root.createSVGMatrix().translate(p.x, p.y);
            if (options.enableRotate) {
                k = k.rotate(gestureInitRotation + evt.rotation);
            }
            if (options.enableZoom) {
                k = k.scale(gestureInitScale * evt.scale);
            }
            k = k.translate(-p.x, -p.y);
            setCTM(g, k);
            
            // Move to appropriate position
            p = lastPoint.matrixTransform(stateTf);
            setCTM(g, stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y));
        
            stateTf = k.inverse();
            //Ti.API.info('end');
        }
        
        function handleGestureEnd(evt) {
            
        }
        
        function destroy()
        {
            var touch_support = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (touch_support) {
                // Bind manually, because jQuery do it wrong
                svgRoot.removeEventListener("touchstart", handleMouseDown);
                svgRoot.removeEventListener("touchmove", handleMouseMove);
                svgRoot.removeEventListener("touchend", handleMouseUp);
                svgRoot.removeEventListener("gesturestart", handleGestureStart);
                svgRoot.removeEventListener("gesturechange", handleGestureChange);
                svgRoot.removeEventListener("gestureend", handleGestureEnd);
            } else {
                $(svgRoot)
                    .unbind('mousedown', handleMouseDown)
                    .unbind('mousemove', handleMouseDown)
                    .unbind('mouseup', handleMouseDown)
                    
                if(navigator.userAgent.toLowerCase().indexOf('webkit') >= 0)
                    window.removeEventListener('mousewheel', handleMouseWheel); // Chrome/Safari
                else
                    window.removeEventListener('DOMMouseScroll', handleMouseWheel); // Others
            }
        }

    }
})(oldJQ);