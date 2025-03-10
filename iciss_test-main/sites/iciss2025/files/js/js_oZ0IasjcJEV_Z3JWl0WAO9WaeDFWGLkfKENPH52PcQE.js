(function ($) {

Drupal.jQueryUiFilter = Drupal.jQueryUiFilter || {}
Drupal.jQueryUiFilter.accordionOptions = Drupal.jQueryUiFilter.accordionOptions || {}

/**
 * Scroll to an accordion's active element.
 */
Drupal.jQueryUiFilter.accordionScrollTo = function(accordion) {
  var options = $(accordion).data('options') || {}
  if (!options['scrollTo'] || !$(accordion).find('.ui-state-active').length) {
    return;
  }

  var top = $(accordion).find('.ui-state-active').offset().top;
  if (options['scrollTo']['duration']) {
    $('html, body').animate({scrollTop: top}, options['scrollTo']['duration']);
  }
  else {
    $('html, body').scrollTop(top);
  }
}

/**
 * Accordion change event handler to bookmark active element in location.hash.
 */
Drupal.jQueryUiFilter.accordionChangeStart = function(event, ui) {
  var href = ui.newHeader.find('a').attr('href');
  if (href) {
    location.hash = href;
    return false; // Cancel event and let accordionHashChangeEvent handler activate the element.
  }
  else {
    return true;
  }
}

/**
 * On hash change activate and scroll to an accordion element.
 */
Drupal.jQueryUiFilter.accordionHashChangeEvent = function() {
  $accordionHeader = $('.ui-accordion > .ui-accordion-header:has(a[href="' + location.hash + '"])')
  $accordion = $accordionHeader.parent();
  var index = $accordionHeader.prevAll('.ui-accordion-header').length;

  if ($.ui.version == '1.8.7') {
    // NOTE: Accordion 'Active' property not change'ing http://bugs.jqueryui.com/ticket/4576
    $accordion.accordion('activate', index);
  }
  else {
    // NOTE: Accordion 'Active' property http://api.jqueryui.com/accordion/#option-active
    $accordion.accordion('option', 'active', index);
  }
}

/**
 * jQuery UI filter accordion behavior.
 */
Drupal.behaviors.jQueryUiFilterAccordion  = {attach: function(context) {
  if (Drupal.settings.jQueryUiFilter.disabled) {
    return;
  }

  var headerTag = Drupal.settings.jQueryUiFilter.accordionHeaderTag;

  $('div.jquery-ui-filter-accordion', context).once('jquery-ui-filter-accordion', function () {
    var options = Drupal.jQueryUiFilter.getOptions('accordion');

    // Look for jQuery UI filter header class.
    options['header'] = '.jquery-ui-filter-accordion-header';

    if ($(this).hasClass('jquery-ui-filter-accordion-collapsed')) { // Set collapsed options
      options['collapsible'] = true;
      options['active'] = false;
    }

    // Convert <h*> to div to remove tag and insure the accordion does not use the existing h3 style.
    // Sets active item based on location.hash.
    var index = 0;
    $(this).find(headerTag + '.jquery-ui-filter-accordion-header').each(function(){
      var id = this.id || $(this).text().toLowerCase().replace(/[^-a-z0-9]+/gm, '-');
      var hash = '#' + id;
      if (hash == location.hash) {
        options['active'] = index;
      }
      index++;

      $(this).replaceWith('<div class="jquery-ui-filter-header jquery-ui-filter-accordion-header"><a href="' + hash + '">' + $(this).html() + '</a></div>');
    });

    // DEBUG:
    // console.log(options);

    // Save options as data and init accordion
    $(this).data('options', options).accordion(options);

    // Scroll to active
    Drupal.jQueryUiFilter.accordionScrollTo(this);

    // Bind accordion change event to record history
    if (options['history']) {
      $(this).bind('accordionchangestart', Drupal.jQueryUiFilter.accordionChangeStart);
    }

    // Init hash change event handling once
    if (!Drupal.jQueryUiFilter.accordionInitialized) {
      Drupal.jQueryUiFilter.hashChange(Drupal.jQueryUiFilter.accordionHashChangeEvent);
    }
    Drupal.jQueryUiFilter.accordionInitialized = true;
  });

}}

})(jQuery);
;
(function ($) {

Drupal.jQueryUiFilter = Drupal.jQueryUiFilter || {}
Drupal.jQueryUiFilter.dialogOptions = Drupal.jQueryUiFilter.dialogOptions || {closeText : 'close'}

// Set default dialog query parameter.
var match = /dialogFeatures=([^&]+)/.exec(location.search);
Drupal.jQueryUiFilter.dialogOptions.dialogFeatures = ((match) ? match[1] : {});

/**
 * Reload page with uuid to insure cache is cleared
 */
Drupal.jQueryUiFilter.dialogReloadPage = function() {
  top.location.href = top.location.pathname +
    ((top.location.search) ? top.location.search + '&' : '?') +
    'no-cache=' + ((new Date().getTime()) * Math.random(10));

  // Close dialog so that the user sees something has happened.
  $('#jquery-ui-filter-dialog').dialog('destroy');
}

/**
 * Convert dialogFeatures array to string.
 */
Drupal.jQueryUiFilter.dialogFeaturesToString = function(dialogFeatures) {
  if (typeof dialogFeatures == 'string') {
    return dialogFeatures;
  }

  dialogFeatures['protocol'] = location.protocol.replace(':', '');

  var features = [];
  for(var name in dialogFeatures) {
    features[features.length] = name + '=' + dialogFeatures[name];
  }
  return features.join(',');
}

/**
 * Append to dialogFeatures to URL query string via '?dialogFeatures=1' or '?dialogFeatures=form-onsubmit_close=1'.
 */
Drupal.jQueryUiFilter.dialogFeaturesAppendToURL = function(url, dialogFeatures) {
  if (url.indexOf('dialogFeatures') !== -1) {
    return url;
  }

  dialogFeatures = dialogFeatures || Drupal.jQueryUiFilter.dialogOptions.dialogFeatures;
  dialogFeatures = Drupal.jQueryUiFilter.dialogFeaturesToString(dialogFeatures);

  var query = ((url.indexOf('?') === -1) ? '?' : '&') + 'dialogFeatures=' + dialogFeatures;
  if (url.indexOf('#') !== -1) {
    return url.replace('#', query + '#');
  }
  else {
    return url + query;
  }
}

/**
 * Open jQuery UI filter dialog. Allows other modules to re-use this functionality.
 */
Drupal.jQueryUiFilter.dialogOpen = function(url, options) {
  // Check url against whitelist
  if (url.indexOf('://') !== -1) {
    var domain = url.match(/:\/\/(.[^/]+)/)[1];
    var whitelist = Drupal.settings.jQueryUiFilter.dialogWhitelist.split(/\s+/);
    whitelist[whitelist.length] = location.hostname; // Always add custom host
    if (jQuery.inArray(domain, whitelist) == -1) {
      window.location = url;
      return;
    }
  }

  // Initialize options with dialogFeatures.
  options = jQuery.extend(
    {dialogFeatures: {}},
    $.ui.dialog.prototype.options,
    options
  );

  // Destroy dialog when it is closed.
  options['close'] = function(event, ui) {
    $(this).dialog('destroy').remove();
  }

  // Automatically adjust iframe height based on window settings.
  var windowHeight = $(window).height() - 50;
  var windowWidth = $(window).width() - 50;
  if (options['height'] == 'auto') {
    options['height'] = options['maxHeight'] || windowHeight;
  }
  if (options['width'] == 'auto') {
    options['width'] = options['maxWidth'] || windowWidth;
  }

  // Make sure dialog is not larger then the viewport.
  if (options['height'] > windowHeight) {
    options['height'] = windowHeight;
  }
  if (options['width'] > windowWidth) {
    options['width'] = windowWidth;
  }

  // Add close button to dialog
  if (options['closeButton']) {
    options['buttons'][ Drupal.t(options['closeText'] || 'Close') ] = function() {
      $(this).dialog('close');
    }
  }
  delete options['closeButton'];

  // Set iframe scrolling attribute.
  options['scrolling'] = options['scrolling'] || 'auto';

  // Set dialog URL with ?dialogFeature= parameters.
  url = Drupal.jQueryUiFilter.dialogFeaturesAppendToURL(url, options['dialogFeatures']);

  // Remove existing dialog and iframe, this allows us to reset the
  // dialog's options and allow dialogs to open external domains.
  $('#jquery-ui-filter-dialog').dialog('destroy').remove();

  // Create iframe
  $('body').append('<div id="jquery-ui-filter-dialog">'
    + '<div id="jquery-ui-filter-dialog-container">'
    + '<iframe id="jquery-ui-filter-dialog-iframe" name="jquery-ui-filter-dialog-iframe" width="100%" height="100%" marginWidth="0" marginHeight="0" frameBorder="0" scrolling="' + options['scrolling'] + '" src="' + url + '" />'
    + '</div>'
    + '</div>'
  );

  // Open dialog
  $('#jquery-ui-filter-dialog').dialog(options);

  // DEBUG:
  // console.log(options);
}

/**
 * jQuery UI filter dialog behavior
 */
Drupal.behaviors.jQueryUiFilterDialog = {attach: function(context) {
  if (Drupal.settings.jQueryUiFilter.disabled) {
    return;
  }

  // Append ?jquery_ui_filter_dialog=1 to all link and form action inside a dialog iframe with dialogFeatures.
  if ((top != self) && (self.location.search.indexOf('dialogFeatures') !== -1)) {
    $('a', context).once('jquery-ui-filter-dialog-link', function() {
      if (this.tagName == 'A') {
        this.href = Drupal.jQueryUiFilter.dialogFeaturesAppendToURL(this.href);
      }
      else if (this.tagName == 'FORM') {
        this.action = Drupal.jQueryUiFilter.dialogFeaturesAppendToURL(this.action);
      }
    });

    // Do not allow dialogs to be nested inside of dialogs.
    return;
  }

  $('a.jquery-ui-filter-dialog', context).once('jquery-ui-filter-dialog', function () {
    $(this).click(function() {
      // Get hidden JSON string that has been cleaned up on the server using PHP.
      // See _jquery_ui_filter_dialog_process_replacer().
      var json  = $(this).attr('rel');
      if (json) {
        var options = Drupal.jQueryUiFilter.getOptions('dialog', JSON.parse(unescape(json)));
      }
      else {
        var options = Drupal.jQueryUiFilter.getOptions('dialog', {});
      }
      // Customize dialog using the link's title.
      if ($(this).attr('title')) {
        options['title'] = $(this).attr('title');
      }

      Drupal.jQueryUiFilter.dialogOpen(this.href, options);
      return false;
    });
  });
}}

})(jQuery);
;
(function ($) {

/**
 * Equal height plugin.
 *
 * From: http://www.problogdesign.com/coding/30-pro-jquery-tips-tricks-and-strategies/
 */
if (jQuery.fn.equalHeight == undefined) {
  jQuery.fn.equalHeight = function () {
    var tallest = 0;
    this.each(function() {
      tallest = ($(this).height() > tallest)? $(this).height() : tallest;
    });
    return this.height(tallest);
  }
}

Drupal.jQueryUiFilter = Drupal.jQueryUiFilter || {}
Drupal.jQueryUiFilter.tabsOptions = Drupal.jQueryUiFilter.tabsOptions || {}

/**
 * Tabs pagings
 *
 * Inspired by : http://css-tricks.com/2361-jquery-ui-tabs-with-nextprevious/
 */
Drupal.jQueryUiFilter.tabsPaging = function(selector, options) {
  options = jQuery.extend({paging: {'back': '&#171; Previous', 'next': 'Next &#187;'}}, options);

  var $tabs = $(selector);
  var numberOfTabs = $tabs.find(".ui-tabs-panel").size() - 1;

  // Add back and next buttons.
  // NOTE: Buttons are not 'themeable' since they should look like a themerolled jQuery UI button.
  $tabs.find('.ui-tabs-panel').each(function(i){
    var html = '';
    if (i != 0) {
      html += '<button type="button" class="ui-tabs-prev" rel="' + (i-1) + '" style="float:left">' + Drupal.t(options.paging.back) + '</button>';
    }
    if (i != numberOfTabs) {
      html += '<button type="button" href="#" class="ui-tabs-next" rel="' + (i+1) + '" style="float:right">' + Drupal.t(options.paging.next) + '</button>';
    }
    $(this).append('<div class="ui-tabs-paging clearfix clear-block">' +  html + '</div>');
  });

  // Init buttons
  $tabs.find('button.ui-tabs-prev, button.ui-tabs-next').button();

  // Add event handler
  $tabs.find('.ui-tabs-next, .ui-tabs-prev').click(function() {
    if ($.ui.version == '1.8.7') {
      $tabs.tabs('select', parseInt($(this).attr("rel")));
    }
    else {
      $tabs.tabs('option', 'active', parseInt($(this).attr("rel")));
    }
    return false;
  });
}

/**
 * Scroll to an accordion's active element.
 */
Drupal.jQueryUiFilter.tabsScrollTo = function(tabs) {
  var options = $(tabs).data('options') || {}
  if (!options['scrollTo']) {
    return;
  }

  var top = $(tabs).offset().top;
  if (options['scrollTo']['duration']) {
    $('html, body').animate({scrollTop: top}, options['scrollTo']['duration']);
  }
  else {
    $('html, body').scrollTop(top);
  }
}


/**
 * Tabs select event handler to bookmark selected tab in location.hash.
 */
Drupal.jQueryUiFilter.tabsSelect = function(event, ui) {
  location.hash = $(ui.tab).attr('href');
}

/**
 * On hash change select tab.
 *
 * Inspired by: http://benalman.com/code/projects/jquery-bbq/examples/fragment-jquery-ui-tabs/
 */
Drupal.jQueryUiFilter.tabsHashChangeEvent = function() {
  var $tab = $('.ui-tabs-nav > li:has(a[href="' + location.hash + '"])');
  $tabs = $tab.parent().parent();

  var selected = $tab.prevAll().length;

  if ($.ui.version == '1.8.7') {
    if ($tabs.tabs('option', 'selected') != selected) {
      $tabs.tabs('select', selected);
    }
  }
  else {
    if ($tabs.tabs('option', 'active') != selected) {
      $tabs.tabs('option', 'active', selected);
    }
  }
}

/**
 * jQuery UI filter tabs behavior
 */
Drupal.behaviors.jQueryUiFilterTabs = {attach: function(context) {
  if (Drupal.settings.jQueryUiFilter.disabled) {
    return;
  }

  var headerTag = Drupal.settings.jQueryUiFilter.tabsHeaderTag;

  // Tabs
  $('div.jquery-ui-filter-tabs', context).once('jquery-ui-filter-tabs', function () {
    var options = Drupal.jQueryUiFilter.getOptions('tabs');

    // Get <h*> text and add to tabs.
    // Sets selected tab based on location.hash.
    var scrollTo = false;
    var index = 0;
    var tabs = '<ul>';
    $(this).find(headerTag + '.jquery-ui-filter-tabs-header').each(function(){
      var id = this.id || $(this).text().toLowerCase().replace(/[^-a-z0-9]+/gm, '-');
      var hash = '#' + id;

      if (hash == location.hash) {
        scrollTo = true;
        options['selected'] = index;
      }
      index++;

      tabs += '<li><a href="' + hash + '">' + $(this).html() + '</a></li>';
      $(this).next('div.jquery-ui-filter-tabs-container').attr('id', id);
      $(this).remove();
    });
    tabs += '</ul>';
    $(this).prepend(tabs);

    // DEBUG:
    // console.log(options);

    // Save options as data and init tabs
    $(this).data('options', options).tabs(options);

    // Equal height tab
    $(this).find('.ui-tabs-nav li').equalHeight();

    // Add paging.
    if (options['paging']) {
      Drupal.jQueryUiFilter.tabsPaging(this, options);
    }

    // Bind tabs select event to record history
    if (options['history']) {
      $(this).bind('tabsselect', Drupal.jQueryUiFilter.tabsSelect);
    }

    // Scroll to selected tabs widget
    if (scrollTo) {
      Drupal.jQueryUiFilter.tabsScrollTo(this);
    }

    // Init hash change event handling once
    if (!Drupal.jQueryUiFilter.hashChangeInit) {
      Drupal.jQueryUiFilter.hashChange(Drupal.jQueryUiFilter.tabsHashChangeEvent);
    }
    Drupal.jQueryUiFilter.hashChangeInit = true;
  });
}}

})(jQuery);
;
(function ($) {

Drupal.googleanalytics = {};

$(document).ready(function() {

  // Attach mousedown, keyup, touchstart events to document only and catch
  // clicks on all elements.
  $(document.body).bind("mousedown keyup touchstart", function(event) {

    // Catch the closest surrounding link of a clicked element.
    $(event.target).closest("a,area").each(function() {

      // Is the clicked URL internal?
      if (Drupal.googleanalytics.isInternal(this.href)) {
        // Skip 'click' tracking, if custom tracking events are bound.
        if ($(this).is('.colorbox') && (Drupal.settings.googleanalytics.trackColorbox)) {
          // Do nothing here. The custom event will handle all tracking.
          //console.info("Click on .colorbox item has been detected.");
        }
        // Is download tracking activated and the file extension configured for download tracking?
        else if (Drupal.settings.googleanalytics.trackDownload && Drupal.googleanalytics.isDownload(this.href)) {
          // Download link clicked.
          gtag('event', Drupal.googleanalytics.getDownloadExtension(this.href).toUpperCase(), {
            event_category: 'Downloads',
            event_label: Drupal.googleanalytics.getPageUrl(this.href),
            transport_type: 'beacon'
          });
        }
        else if (Drupal.googleanalytics.isInternalSpecial(this.href)) {
          // Keep the internal URL for Google Analytics website overlay intact.
          // @todo: May require tracking ID
          var target = this;
          $.each(drupalSettings.google_analytics.account, function () {
            gtag('config', this, {
              page_path: Drupal.googleanalytics.getPageUrl(target.href),
              transport_type: 'beacon'
            });
          });
        }
      }
      else {
        if (Drupal.settings.googleanalytics.trackMailto && $(this).is("a[href^='mailto:'],area[href^='mailto:']")) {
          // Mailto link clicked.
          gtag('event', 'Click', {
            event_category: 'Mails',
            event_label: this.href.substring(7),
            transport_type: 'beacon'
          });
        }
        else if (Drupal.settings.googleanalytics.trackOutbound && this.href.match(/^\w+:\/\//i)) {
          if (Drupal.settings.googleanalytics.trackDomainMode !== 2 || (Drupal.settings.googleanalytics.trackDomainMode === 2 && !Drupal.googleanalytics.isCrossDomain(this.hostname, Drupal.settings.googleanalytics.trackCrossDomains))) {
            // External link clicked / No top-level cross domain clicked.
            gtag('event', 'Click', {
              event_category: 'Outbound links',
              event_label: this.href,
              transport_type: 'beacon'
            });
          }
        }
      }
    });
  });

  // Track hash changes as unique pageviews, if this option has been enabled.
  if (Drupal.settings.googleanalytics.trackUrlFragments) {
    window.onhashchange = function() {
      $.each(drupalSettings.google_analytics.account, function () {
        gtag('config', this, {
          page_path: location.pathname + location.search + location.hash
        });
      });
    };
  }

  // Colorbox: This event triggers when the transition has completed and the
  // newly loaded content has been revealed.
  if (Drupal.settings.googleanalytics.trackColorbox) {
    $(document).bind("cbox_complete", function () {
      var href = $.colorbox.element().attr("href");
      if (href) {
        $.each(drupalSettings.google_analytics.account, function () {
          gtag('config', this, {
            page_path: Drupal.googleanalytics.getPageUrl(href)
          });
        });
      }
    });
  }

});

/**
 * Check whether the hostname is part of the cross domains or not.
 *
 * @param string hostname
 *   The hostname of the clicked URL.
 * @param array crossDomains
 *   All cross domain hostnames as JS array.
 *
 * @return boolean
 */
Drupal.googleanalytics.isCrossDomain = function (hostname, crossDomains) {
  /**
   * jQuery < 1.6.3 bug: $.inArray crushes IE6 and Chrome if second argument is
   * `null` or `undefined`, https://bugs.jquery.com/ticket/10076,
   * https://github.com/jquery/jquery/commit/a839af034db2bd934e4d4fa6758a3fed8de74174
   *
   * @todo: Remove/Refactor in D8
   */
  if (!crossDomains) {
    return false;
  }
  else {
    return $.inArray(hostname, crossDomains) > -1 ? true : false;
  }
};

/**
 * Check whether this is a download URL or not.
 *
 * @param string url
 *   The web url to check.
 *
 * @return boolean
 */
Drupal.googleanalytics.isDownload = function (url) {
  var isDownload = new RegExp("\\.(" + Drupal.settings.googleanalytics.trackDownloadExtensions + ")([\?#].*)?$", "i");
  return isDownload.test(url);
};

/**
 * Check whether this is an absolute internal URL or not.
 *
 * @param string url
 *   The web url to check.
 *
 * @return boolean
 */
Drupal.googleanalytics.isInternal = function (url) {
  var isInternal = new RegExp("^(https?):\/\/" + window.location.host, "i");
  return isInternal.test(url);
};

/**
 * Check whether this is a special URL or not.
 *
 * URL types:
 *  - gotwo.module /go/* links.
 *
 * @param string url
 *   The web url to check.
 *
 * @return boolean
 */
Drupal.googleanalytics.isInternalSpecial = function (url) {
  var isInternalSpecial = new RegExp("(\/go\/.*)$", "i");
  return isInternalSpecial.test(url);
};

/**
 * Extract the relative internal URL from an absolute internal URL.
 *
 * Examples:
 * - https://mydomain.com/node/1 -> /node/1
 * - https://example.com/foo/bar -> https://example.com/foo/bar
 *
 * @param string url
 *   The web url to check.
 *
 * @return string
 *   Internal website URL
 */
Drupal.googleanalytics.getPageUrl = function (url) {
  var extractInternalUrl = new RegExp("^(https?):\/\/" + window.location.host, "i");
  return url.replace(extractInternalUrl, '');
};

/**
 * Extract the download file extension from the URL.
 *
 * @param string url
 *   The web url to check.
 *
 * @return string
 *   The file extension of the passed url. e.g. "zip", "txt"
 */
Drupal.googleanalytics.getDownloadExtension = function (url) {
  var extractDownloadextension = new RegExp("\\.(" + Drupal.settings.googleanalytics.trackDownloadExtensions + ")([\?#].*)?$", "i");
  var extension = extractDownloadextension.exec(url);
  return (extension === null) ? '' : extension[1];
};

})(jQuery);
;
