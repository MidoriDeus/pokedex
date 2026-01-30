// Función para obtener el nombre del tipo en español
function getTypeNameInSpanish(type) {
    const typeTranslations = {
        'normal': 'Normal',
        'fire': 'Fuego',
        'water': 'Agua',
        'electric': 'Eléctrico',
        'grass': 'Planta',
        'ice': 'Hielo',
        'fighting': 'Lucha',
        'poison': 'Veneno',
        'ground': 'Tierra',
        'flying': 'Volador',
        'psychic': 'Psíquico',
        'bug': 'Bicho',
        'rock': 'Roca',
        'ghost': 'Fantasma',
        'dragon': 'Dragón',
        'dark': 'Oscuro',
        'steel': 'Acero',
        'fairy': 'Hada'
    };
    return typeTranslations[type] || type;
}

// Global variables
let allPokemonData = [];
let allTypes = [];

// DOM Elements
const pokemonContainer = document.getElementById('pokemonContainer');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const typeFilter = document.getElementById('typeFilter');
const loadingSpinner = document.getElementById('loadingSpinner');
const modal = document.getElementById('pokemonDetailModal');
const closeModal = document.querySelector('.close');
const pokemonDetails = document.getElementById('pokemonDetails');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Ensure modal is hidden on initial load
    modal.classList.add('hidden');
    loadInitialPokemon();
    setupEventListeners();
});

// Load initial Pokémon data (first 50)
async function loadInitialPokemon() {
    showLoading(true);
    try {
        // Fetch first 151 Pokémon (Generation 1)
        const promises = [];
        for (let i = 1; i <= 151; i++) {
            promises.push(fetchPokemonData(i));
        }

        allPokemonData = await Promise.all(promises);
        displayPokemon(allPokemonData);

        // Also fetch all possible types
        await loadAllTypes();
    } catch (error) {
        console.error('Error cargando Pokémon iniciales:', error);
    } finally {
        showLoading(false);
    }
}

// Fetch all possible Pokémon types
async function loadAllTypes() {
    try {
        const response = await fetch('https://pokeapi.co/api/v2/type/');
        const data = await response.json();
        allTypes = data.results.map(type => type.name);
        
        // Populate the type filter dropdown
        populateTypeFilter();
    } catch (error) {
        console.error('Error cargando tipos de Pokémon:', error);
    }
}

// Populate the type filter dropdown
function populateTypeFilter() {
    typeFilter.innerHTML = '<option value="">Todos los Tipos</option>';
    allTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = getTypeNameInSpanish(type);
        typeFilter.appendChild(option);
    });
}

// Fetch individual Pokémon data
async function fetchPokemonData(id) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Fetch species data for additional info
        const speciesResponse = await fetch(data.species.url);
        if (!speciesResponse.ok) {
            throw new Error(`HTTP error! status: ${speciesResponse.status}`);
        }
        const speciesData = await speciesResponse.json();

        // Fetch type data to get weaknesses
        const typeResponses = await Promise.all(
            data.types.map(typeInfo => fetch(typeInfo.type.url))
        );
        const typeData = await Promise.all(
            typeResponses.map(response => response.json())
        );

        // Find Spanish description if available, otherwise use English
        let description = 'Descripción no disponible.';
        const spanishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'es');
        const englishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');

        if (spanishEntry) {
            description = spanishEntry.flavor_text;
        } else if (englishEntry) {
            description = englishEntry.flavor_text;
        }

        // Handle image fallback
        const officialArtwork = data.sprites.other?.['official-artwork']?.front_default;
        const defaultSprite = data.sprites.front_default;
        const image = officialArtwork || defaultSprite || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/0.png';

        // Extract weaknesses from type data
        const weaknesses = [];
        typeData.forEach(type => {
            type.damage_relations.double_damage_from.forEach(damageType => {
                if (!weaknesses.includes(damageType.name)) {
                    weaknesses.push(damageType.name);
                }
            });
        });

        return {
            id: data.id,
            name: data.name,
            image: image,
            types: data.types.map(typeInfo => typeInfo.type.name),
            weaknesses: weaknesses,
            height: data.height / 10, // Convert decimeters to meters
            weight: data.weight / 10, // Convert hectograms to kilograms
            abilities: data.abilities.map(abilityInfo => abilityInfo.ability.name),
            stats: {
                hp: data.stats[0].base_stat,
                attack: data.stats[1].base_stat,
                defense: data.stats[2].base_stat,
                specialAttack: data.stats[3].base_stat,
                specialDefense: data.stats[4].base_stat,
                speed: data.stats[5].base_stat
            },
            description: description.replace(/\n/g, ' ').replace(/\f/g, ' ')
        };
    } catch (error) {
        console.error(`Error fetching data for Pokémon ${id}:`, error);
        // Return a minimal object even if there's an error
        return {
            id: id,
            name: `Pokémon ${id}`,
            image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/0.png',
            types: ['normal'],
            weaknesses: [],
            height: 0,
            weight: 0,
            abilities: [],
            stats: {
                hp: 0,
                attack: 0,
                defense: 0,
                specialAttack: 0,
                specialDefense: 0,
                speed: 0
            },
            description: 'Información no disponible temporalmente.'
        };
    }
}

// Display Pokémon in the grid
function displayPokemon(pokemonList) {
    pokemonContainer.innerHTML = '';

    pokemonList.forEach(pokemon => {
        if (!pokemon) return; // Skip if pokemon data is null

        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.dataset.id = pokemon.id;

        // Handle cases where types might be undefined
        const typesHtml = pokemon.types && Array.isArray(pokemon.types)
            ? pokemon.types.map(type => `<span class="type-badge ${type}">${getTypeNameInSpanish(type)}</span>`).join('')
            : '<span class="type-badge normal">Normal</span>';

        card.innerHTML = `
            <div class="pokemon-id">#${String(pokemon.id).padStart(3, '0')}</div>
            <div class="pokemon-image-container">
                <img src="${pokemon.image || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/0.png'}"
                     alt="${pokemon.name || 'Unknown'}"
                     class="pokemon-image"
                     onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/0.png'">
            </div>
            <div class="pokemon-info">
                <div class="pokemon-name">${pokemon.name || 'Desconocido'}</div>
                <div class="pokemon-types">
                    ${typesHtml}
                </div>
            </div>
        `;

        if (pokemon) {
            card.addEventListener('click', () => showPokemonDetails(pokemon));
        }
        pokemonContainer.appendChild(card);
    });
}

// Show loading spinner
function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Type filter
    typeFilter.addEventListener('change', handleTypeFilter);
    
    // Modal close button
    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    // Close modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Prevent any accidental showing of modal on page load
    document.addEventListener('DOMContentLoaded', () => {
        // Ensure modal is hidden on initial load
        modal.classList.add('hidden');
    });
}

// Handle search
async function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        displayPokemon(allPokemonData);
        return;
    }
    
    // Check if search term is a number (Pokédex ID)
    const searchId = parseInt(searchTerm);
    if (!isNaN(searchId)) {
        // If it's a valid ID, fetch that specific Pokémon
        if (searchId >= 1 && searchId <= 1010) { // Up to the latest known Pokémon
            showLoading(true);
            try {
                const pokemon = await fetchPokemonData(searchId);
                if (pokemon) {
                    displayPokemon([pokemon]);
                } else {
                    pokemonContainer.innerHTML = '<p>No se encontró ningún Pokémon con ese ID.</p>';
                }
            } catch (error) {
                console.error('Error obteniendo datos del Pokémon por ID:', error);
                pokemonContainer.innerHTML = '<p>Error obteniendo datos del Pokémon.</p>';
            } finally {
                showLoading(false);
            }
            return;
        }
    }
    
    // Search by name
    const filteredPokemon = allPokemonData.filter(pokemon => 
        pokemon && pokemon.name.toLowerCase().includes(searchTerm)
    );
    
    displayPokemon(filteredPokemon);
}

// Handle type filter
function handleTypeFilter() {
    const selectedType = typeFilter.value.toLowerCase();

    if (!selectedType) {
        displayPokemon(allPokemonData);
        return;
    }

    const filteredPokemon = allPokemonData.filter(pokemon =>
        pokemon && pokemon.types && pokemon.types.includes(selectedType)
    );

    displayPokemon(filteredPokemon);
}

// Show Pokémon details in modal
function showPokemonDetails(pokemon) {
    // Handle types display
    const typesHtml = pokemon.types && Array.isArray(pokemon.types)
        ? pokemon.types.map(type => `<span class="type-badge ${type}">${getTypeNameInSpanish(type)}</span>`).join(' ')
        : '<span class="type-badge normal">Normal</span>';

    // Handle abilities display
    const abilitiesText = pokemon.abilities && Array.isArray(pokemon.abilities)
        ? pokemon.abilities.map(ability => ability.replace('-', ' ')).join(', ')
        : 'Ninguna';

    // Handle weaknesses display
    const weaknessesText = pokemon.weaknesses && Array.isArray(pokemon.weaknesses) && pokemon.weaknesses.length > 0
        ? pokemon.weaknesses.map(weakness => `<span class="type-badge ${weakness}">${getTypeNameInSpanish(weakness)}</span>`).join(' ')
        : 'No tiene debilidades conocidas';

    // Handle stats display
    const stats = pokemon.stats || {};

    pokemonDetails.innerHTML = `
        <div class="detail-header">
            <img src="${pokemon.image || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/0.png'}"
                 alt="${pokemon.name || 'Desconocido'}"
                 class="detail-image"
                 onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/0.png'">
            <div class="detail-info">
                <h2>${(pokemon.name || 'Desconocido').charAt(0).toUpperCase() + (pokemon.name || 'Desconocido').slice(1)}</h2>
                <p><strong>ID:</strong> #${String(pokemon.id || 0).padStart(3, '0')}</p>
                <p><strong>Tipos:</strong> ${typesHtml}</p>
            </div>
        </div>

        <p><strong>Descripción:</strong> ${(pokemon.description || 'No disponible').replace(/\n/g, ' ')}</p>

        <div class="detail-stats">
            <div class="stat"><strong>Debilidades:</strong> ${weaknessesText}</div>
            <div class="stat"><strong>Altura:</strong> ${(pokemon.height || 0)} m</div>
            <div class="stat"><strong>Peso:</strong> ${(pokemon.weight || 0)} kg</div>
            <div class="stat"><strong>Habilidades:</strong> ${abilitiesText}</div>

            <div class="stat"><strong>PS:</strong> ${(stats.hp || 0)}</div>
            <div class="stat"><strong>Ataque:</strong> ${(stats.attack || 0)}</div>
            <div class="stat"><strong>Defensa:</strong> ${(stats.defense || 0)}</div>
            <div class="stat"><strong>At. Esp.:</strong> ${(stats.specialAttack || 0)}</div>
            <div class="stat"><strong>Def. Esp.:</strong> ${(stats.specialDefense || 0)}</div>
            <div class="stat"><strong>Velocidad:</strong> ${(stats.speed || 0)}</div>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Infinite scroll functionality
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        loadMorePokemon();
    }
});

// Load more Pokémon as user scrolls
async function loadMorePokemon() {
    if (allPokemonData.length >= 1010) return; // Current total Pokémon count

    const startIndex = allPokemonData.length + 1;
    const endIndex = Math.min(startIndex + 20, 1010); // Load 20 more at a time

    showLoading(true);

    try {
        const promises = [];
        for (let i = startIndex; i <= endIndex; i++) {
            promises.push(fetchPokemonData(i));
        }

        const newPokemon = await Promise.all(promises);
        allPokemonData = allPokemonData.concat(newPokemon);

        // Reapply any active filters
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedType = typeFilter.value.toLowerCase();

        let pokemonToShow = allPokemonData;

        if (searchTerm) {
            pokemonToShow = allPokemonData.filter(pokemon =>
                pokemon && pokemon.name.toLowerCase().includes(searchTerm)
            );
        }

        if (selectedType) {
            pokemonToShow = pokemonToShow.filter(pokemon =>
                pokemon && pokemon.types.includes(selectedType)
            );
        }

        displayPokemon(pokemonToShow);
    } catch (error) {
        console.error('Error cargando más Pokémon:', error);
    } finally {
        showLoading(false);
    }
}