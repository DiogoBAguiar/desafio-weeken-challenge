"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var client_1 = require("@prisma/client");
var app = (0, express_1.default)();
var prisma = new client_1.PrismaClient();
var PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rota de Healthcheck
app.get('/api/health', function (req, res) {
    res.json({ status: 'ok', time: new Date() });
});
// SPRINT 1 - MVP Público e Geoprocessamento
/**
 * 1.1.1. Visualização de Marcadores em Tempo Real
 * Busca incidentes limitados por um Bounding Box e exibe como marcadores no mapa.
 * Recebe latitude/longitude bounds do cliente
 */
app.get('/api/public/map-data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, minLat, maxLat, minLng, maxLng, categorias, where, catList, incidentes, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.query, minLat = _a.minLat, maxLat = _a.maxLat, minLng = _a.minLng, maxLng = _a.maxLng, categorias = _a.categorias;
                if (!minLat || !maxLat || !minLng || !maxLng) {
                    return [2 /*return*/, res.status(400).json({ error: 'Bounding box query params (minLat, maxLat, minLng, maxLng) are required' })];
                }
                where = {
                    latitude: {
                        gte: parseFloat(minLat),
                        lte: parseFloat(maxLat),
                    },
                    longitude: {
                        gte: parseFloat(minLng),
                        lte: parseFloat(maxLng),
                    },
                    status: 'ativo'
                };
                if (categorias) {
                    catList = categorias.split(',');
                    where.categoria = { in: catList };
                }
                return [4 /*yield*/, prisma.incidente.findMany({
                        where: where,
                        orderBy: { criadoEm: 'desc' },
                        take: 50 // limitando o retorno para não quebrar a UI
                    })];
            case 1:
                incidentes = _b.sent();
                res.json(incidentes);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error(error_1);
                res.status(500).json({ error: 'Erro ao buscar incidentes no mapa.' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 1.1.2. Mapa de Calor (Heatmap)
 * Busca os pontos ofuscados (jitter) apenas de segurança, dos ultimos 30 dias.
 */
app.get('/api/public/heatmap', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, minLat, maxLat, minLng, maxLng, limiteDias, where, incidentes, heatPoints, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.query, minLat = _a.minLat, maxLat = _a.maxLat, minLng = _a.minLng, maxLng = _a.maxLng;
                if (!minLat || !maxLat || !minLng || !maxLng) {
                    return [2 /*return*/, res.status(400).json({ error: 'Bounding box query params (minLat, maxLat, minLng, maxLng) are required' })];
                }
                limiteDias = new Date();
                limiteDias.setDate(limiteDias.getDate() - 30);
                where = {
                    latitude: {
                        gte: parseFloat(minLat),
                        lte: parseFloat(maxLat),
                    },
                    longitude: {
                        gte: parseFloat(minLng),
                        lte: parseFloat(maxLng),
                    },
                    // Apenas incidentes ligados à segurança (exclui Eventos Comunitários, por ex)
                    categoria: { not: 'Evento Comunitário' },
                    criadoEm: { gte: limiteDias },
                    status: 'ativo'
                };
                return [4 /*yield*/, prisma.incidente.findMany({
                        where: where,
                        select: { latitude: true, longitude: true, severidade: true }
                    })];
            case 1:
                incidentes = _b.sent();
                heatPoints = incidentes.map(function (inc) {
                    var jitterLat = (Math.random() * 0.0001) - 0.00005; // -0.00005 to 0.00005
                    var jitterLng = (Math.random() * 0.0001) - 0.00005; // -0.00005 to 0.00005
                    return [
                        inc.latitude + (Math.random() > 0.5 ? jitterLat : -jitterLat),
                        inc.longitude + (Math.random() > 0.5 ? jitterLng : -jitterLng),
                        inc.severidade === 'CRITICA' || inc.severidade === 'ALTA' ? 1.0 : 0.5 // Intensidade baseada na gravidade
                    ]; // formato padrão do heatmap [lat, lng, intensidade]
                });
                res.json(heatPoints);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error(error_2);
                res.status(500).json({ error: 'Erro ao renderizar heatmap.' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 API rodando na porta ".concat(PORT));
});
