// Сохраняем текущий URL в переменную
let previousURL = window.location.href;

// Функция возвращающая HTML-шаблон информации о продукте
function getProductInfoTemplate(salesPercentage, basicPriceInRubles) {
    return `
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
`
}

// Функция возвращающая HTML-шаблон складов
function getWarehousesTemplate(filteredWarehousesHTML, allWarehousesHTML, fetchTimeForWarehouse, fetchTimesAndPieces) {
    return `
        <div class="containerWarehouses">
           <b>
             <p class="warehouses">Раскладка по складам</p>
           </b>
          <div class="warehouse">${filteredWarehousesHTML}: ${fetchTimeForWarehouse} час.*</div>
            <div class="all-warehouses" id="salesCountName">
              <div class="warehouse-list">
                 ${allWarehousesHTML}
              </div>
              <div class="delivery-info">
                 ${fetchTimesAndPieces}
              </div>
           </div>
        </div>
`
}

// Возвращает элемент когда он появляется на странице
function getElementBySelector(elementSelector) {
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

// Функция отображения информации о продукте
async function displayProductInfo(product) {
    const priceHistoryButton = await getElementBySelector(".price-history__btn");

    if (priceHistoryButton) {
        const productContainer = document.createElement('div');
        const salesPercentage = product.extended.clientSale;
        const basicPriceInRubles = product.extended.basicPriceU / 100;

        productContainer.innerHTML = getProductInfoTemplate(salesPercentage, basicPriceInRubles)

        priceHistoryButton.parentNode.prepend(productContainer);
    }
}

// Функция отображения складов
async function displayProductWarehouses(products, productData) {
    const sellerDiv = await getElementBySelector(".j-price-block")

    const productWarehouses = products.filter(product => product.id === productData.wh)

    const warehouseNameRegex  = /WB|Склад продавца.*? /gi

    if (sellerDiv) {
        const previousProductCitiesContainer = document.querySelector('.product-cities-container');
        if (previousProductCitiesContainer) {
            previousProductCitiesContainer.remove();
        }

        const productCitiesContainer = document.createElement('div');
        productCitiesContainer.classList.add('product-cities-container');

        const filteredWarehousesHTML = productWarehouses.map(i => `${i.name.replace(warehouseNameRegex, '')}`);

        const allWarehousesHTML = products.map(i =>
            `<div class="commonWarehouses">${i.name.replace(warehouseNameRegex, '')}: </div>`).join("");

        const fetchTimeForWarehouse = productData.time1 + productData.time2

        const fetchTimesAndPieces =  productData.sizes[0].stocks.map(i => {
            return ` 
                <div class="common">
                    <span class="times">${i.time1 + i.time2}ч.</span>
                    <span class="pieces">${i.qty}шт.</span>
                </div>`;
        }).join("")

        productCitiesContainer.innerHTML = getWarehousesTemplate(filteredWarehousesHTML, allWarehousesHTML, fetchTimeForWarehouse, fetchTimesAndPieces)

        sellerDiv.insertAdjacentElement("afterend", productCitiesContainer);
    }
}

// Функция получения идентификаторов складов
function fetchIdCities(productData) {
    const warehouseIds = productData.sizes[0].stocks.map(stock => stock.wh);

    const newUrl = `https://static-basket-01.wb.ru/vol0/data/stores-data.json?wh=${warehouseIds.join(',')}`;

    fetch(newUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Проблема с сетевым запросом');
            }
            return response.json();
        })
        .then(async data => {
            const filteredData = data.filter(i => warehouseIds.includes(i.id));
            await displayProductWarehouses(filteredData, productData);
        })
        .catch(error => {
            console.error('Произошла проблема при выполнении запроса:', error);
        });
}

// Функция получения данных о продукте
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


// Функция для проверки наличия ID продукта в URL
function checkWildberriesId(currentURL) {
    const idPattern = /\/catalog\/(\d+)\/detail\.aspx/;
    const match = currentURL.match(idPattern);

    if (match) {
        const wildberriesId = match[1];
        fetchProductData(wildberriesId);
    }
}

// Проверка изменения URL
function checkURLChange() {
    const currentURL = window.location.href;

    if (currentURL !== previousURL) {

        checkWildberriesId(currentURL)
        previousURL = currentURL;
    }
}

checkWildberriesId(window.location.href)
setInterval(checkURLChange, 500);