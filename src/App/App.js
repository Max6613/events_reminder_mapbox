/* --------
  IMPORTS
-------- */
import mapboxgl from 'mapbox-gl';

import config from '../../app.config.json';
import '../Styles/style.scss';



class App {
    map;

    constructor() {
        mapboxgl.accessToken = config.apis.mapbox_gl.api_key;
    }

    start() {
        console.log( 'Application démarrée' );

        //Définition du centre de la carte à afficher
        const mapCenter = new mapboxgl.LngLat( 2.213749, 47.038165 );

        //Instanciation de la carte
        this.map = new mapboxgl.Map({
            container: 'map',
            style: config.apis.mapbox_gl.map_style,
            center: mapCenter,
            zoom: 5.6
        });
    }
}

const app = new App();
export default app;