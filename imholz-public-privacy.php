<?php
/**
 * Plugin Name: IM HOLZ Public Privacy
 * Description: Avoids public language cookies and WordPress emoji detection storage.
 */
if (!defined('PLL_COOKIE')) {
    define('PLL_COOKIE', false);
}
add_action('init', function () {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('wp_enqueue_scripts', 'wp_enqueue_emoji_styles');
});

