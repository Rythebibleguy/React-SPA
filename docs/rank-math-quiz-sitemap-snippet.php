/**
 * Add Quiz URL to Rank Math sitemap with DEBUG LOGGING
 */
defined( 'ABSPATH' ) || exit;

add_filter( 'rank_math/sitemap/providers', function( $providers ) {
    error_log( 'Rank Math Debug: Entering sitemap providers filter.' );

    $providers['quiz'] = new class implements \RankMath\Sitemap\Providers\Provider {
        public function handles_type( $type ) {
            $is_quiz = ( 'quiz' === $type );
            if ( $is_quiz ) {
                error_log( 'Rank Math Debug: Handling "quiz" type request.' );
            }
            return $is_quiz;
        }

        public function get_index_links( $max_entries ) {
            error_log( 'Rank Math Debug: Generating index link for quiz-sitemap.xml' );
            return [
                [
                    'loc'     => \RankMath\Sitemap\Router::get_base_url( 'quiz-sitemap.xml' ),
                    'lastmod' => gmdate( 'c', time() ),
                ],
            ];
        }

        public function get_sitemap_links( $type, $max_entries, $current_page ) {
            error_log( 'Rank Math Debug: Generating individual quiz links.' );
            return [
                [
                    'loc' => 'https://rythebibleguy.com/quiz/',
                    'mod' => gmdate( 'Y-m-d' ),
                ],
            ];
        }
    };

    return $providers;
} );