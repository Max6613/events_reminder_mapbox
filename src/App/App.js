/* --------
  IMPORTS
-------- */
import mapboxgl from 'mapbox-gl';

import config from '../../app.config.json';
import '../Styles/style.scss';

import { UpdateButtonControl } from './UpdateButtonControl';
import { FiltersControl } from "./FiltersControl";


class App {
    map;
    markers = [];

    constructor() {
        mapboxgl.accessToken = config.apis.mapbox_gl.api_key;
    }

    start() {
        console.log('Application démarrée');

        //Définition du centre de la carte à afficher
        const mapCenter = new mapboxgl.LngLat(1.751749, 47.038165);

        //Instanciation de la carte
        this.map = new mapboxgl.Map({
            container: 'map',
            style: config.apis.mapbox_gl.map_style,
            center: mapCenter,
            zoom: 5.6
        });

        /* --------------------
        Controles personnalisés
        -------------------- */
        //Bouton d'actualisation
        const updateBtn = new UpdateButtonControl();
        this.map.addControl(updateBtn, 'top-left');

        //Catégories
        const filters = new FiltersControl();
        this.map.addControl(filters, 'top-right');


        /* -------
        FORMULAIRE
        ------- */
        const form_btn = document.querySelector('#formEvent > button');
        form_btn.addEventListener('click', this.formHandler.bind( this ) );
    }


    formHandler( event ) {
        //TODO validation des entrées utilisateurs

        const form = document.querySelector( '#formEvent' );

        const lat = form['event_lat'].value;
        const lng = form['event_lng'].value;

        // Ajout d'un Marker
        let marker = new mapboxgl.Marker();
        marker
            .setLngLat({lng, lat} )
            // .setPopup(  )
            .addTo( this.map );

        this.markers.push( marker );
    }
}

const app = new App();
export default app;