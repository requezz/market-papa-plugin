function waitForElementToExist(elementSelector) {
    return new Promise(resolve => {
        const targetElement = document.querySelector(elementSelector);
        if (targetElement) {
            resolve(targetElement);
        } else {
            const mutationObserver = new MutationObserver(mutations => {
                const targetElement = document.querySelector(elementSelector);
                if (targetElement) {
                    resolve(targetElement);
                    mutationObserver.disconnect();
                }
            });
            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    });
}

async function displayProductInfo(product) {
    const priceHistoryButton = await waitForElementToExist(".price-history__btn");

    if (priceHistoryButton) {
        const productContainer = document.createElement('div');
        const salesPercentage = product.extended.clientSale;
        const basicPriceInRubles = product.extended.basicPriceU / 100;

        productContainer.innerHTML = `
            <div class="product-info-container">
                <b>
                    <p class="spp-text">СПП:</p>
                </b>
                <b>
                    <span class="sales-count" id="salesCountName">${salesPercentage}%</span>
                </b>
                <div class="price-up-to-spp">
                    <p class="to-spp-text">До СПП:</p>
                    <span class="basic-count" id="basicCount">${basicPriceInRubles}₽</span>
                </div>
            </div>
        `;

        priceHistoryButton.parentNode.prepend(productContainer);
    }
}

async function displayFilteredProducts(products) {
    const sellerDiv = await waitForElementToExist(".j-price-block")

    if (sellerDiv) {
        const previousProductCitiesContainer = document.querySelector('.product-cities-container');
        if (previousProductCitiesContainer) {
            previousProductCitiesContainer.remove();
        }

        const productCitiesContainer = document.createElement('div');
        productCitiesContainer.classList.add('product-cities-container');


        productCitiesContainer.innerHTML = `
               <div class="containerWarehouses">
                    <b>
                       <p class="warehouses">Раскладка по складам</p>
                    </b>
                    <b>
                       <span class="sales-count" id="salesCountName">${products.map(i => i.name)}: </span>
                    </b>
               </div>
                    `;

            sellerDiv.insertAdjacentElement("afterend", productCitiesContainer);
        }
}

function fetchIdCities(productData) {
    let time1String = ""
    let time2String = ""
    const cityId = []

    productData.sizes[0].stocks.forEach(i => {
        cityId.push(i.wh)
        time1String = i.time1
        time2String = i.time2
    })

    const newUrl = `https://static-basket-01.wb.ru/vol0/data/stores-data.json?wh=${cityId.join(',')}`;

    fetch(newUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Проблема с сетевым запросом');
            }
            return response.json();
        })
        .then(async data => {
            const filteredData = data.filter(i => cityId.includes(i.id))
            await displayFilteredProducts(filteredData);
        })
        .catch(error => {
            console.error('Произошла проблема при выполнении запроса:', error);
        });
}


function fetchProductData(wildberriesId) {
    const productURL = `https://card.wb.ru/cards/detail?appType=1&curr=rub&appType=1&curr=rub&dest=-1257786&regions=80,83,38,4,64,33,68,70,30,40,86,75,69,1,66,110,22,48,31,71,112,114&spp=29&nm=${wildberriesId}`;

    fetch(productURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Проблема с сетевым запросом');
            }
            return response.json();
        })
        .then(async data => {
            const productData = data.data.products[0];
            fetchIdCities(productData);
            await displayProductInfo(productData);
        })
        .catch(error => {
            console.error('Произошла проблема при выполнении запроса:', error);
        });
}

let previousURL = window.location.href;

function checkURLChange() {
    const currentURL = window.location.href;

    if (currentURL !== previousURL) {
        const idPattern = /\/catalog\/(\d+)\/detail\.aspx/;
        const match = currentURL.match(idPattern);

        if (match) {
            const wildberriesId = match[1];
            fetchProductData(wildberriesId);
        }

        previousURL = currentURL;
    }
}

setInterval(checkURLChange, 500)
