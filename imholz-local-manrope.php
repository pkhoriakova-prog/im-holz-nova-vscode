<?php
/**
 * Plugin Name: IM HOLZ Local Manrope
 * Description: Serves the site's Manrope font locally through Oxygen's font URL filter.
 */
add_filter('oxygen_google_fonts_url', function ($url) {
    if (!is_string($url) || strpos($url, 'fonts.googleapis.com/') === false) {
        return $url;
    }
    parse_str((string) wp_parse_url($url, PHP_URL_QUERY), $query);
    if (!isset($query['family']) || strpos($query['family'], 'Manrope:') !== 0 || substr_count($url, 'family=') !== 1) {
        return $url;
    }
    $uploads = wp_upload_dir();
    $relative = '/imholz-fonts/manrope-v23/manrope.css';
    if (!is_readable($uploads['basedir'] . $relative)) {
        return $url;
    }
    return $uploads['baseurl'] . $relative;
});

