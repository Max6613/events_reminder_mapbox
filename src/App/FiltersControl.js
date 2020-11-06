export class FiltersControl {
    onAdd( map ) {
        this._map = map;
        /* -------------------------
        --- Icones de catégories ---
        ------------------------- */
        //> 3 jours (vert)
        const green_check = document.createElement( 'input' );
        green_check.type = 'checkbox';
        // green_check.classList.add( 'cat_check' );
        green_check.id = 'greenCheck';
        green_check.checked = true;

        const green = document.createElement( 'label' );
        green.htmlFor = 'greenCheck';
        green.id = 'greenLbl';
        green.classList.add( 'category_icon' );

        //<= 3 jours (orange)
        const orange_check = document.createElement( 'input' );
        orange_check.type = 'checkbox';
        // orange_check.classList.add( 'cat_check' );
        orange_check.id = 'orangeCheck';
        orange_check.checked = true;

        const orange = document.createElement( 'label' );
        orange.htmlFor = 'orangeCheck';
        orange.id = 'orangeLbl';
        orange.classList.add( 'category_icon' );

        //< 0 jours (rouge)
        const red_check = document.createElement( 'input' );
        red_check.type = 'checkbox';
        // red_check.classList.add( 'cat_check' );
        red_check.id = 'redCheck';
        red_check.checked = true;

        const red = document.createElement( 'label' );
        red.htmlFor = 'redCheck';
        red.id = 'redLbl';
        red.classList.add( 'category_icon' );
        

        //Création de la div de controle
        this._container = document.createElement('div');
        this._container.classList.add( 'mapboxgl-ctrl' );
        this._container.id = 'catIcons';
        this._container.append( green_check, green, orange_check, orange, red_check, red );

        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    // onControlClick( evt ) {
    //     //TODO refraichir les markers / DELETE ???
    //     console.log( "categories" );
    //     console.log( this );
    // }
}