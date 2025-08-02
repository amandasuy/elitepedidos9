import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Clock, 
  User, 
  Package,
  Save,
  X,
  Minus,
  ShoppingCart,
  CreditCard,
  Calculator,
  AlertCircle,
  CheckCircle,
  Search,
  Filter
} from 'lucide-react';
import { RestaurantTable, TableSale, TableSaleItem, TableCartItem } from '../../types/table-sales';

interface TableSalesPanelProps {
  storeId: 1 | 2;
  operatorName?: string;
}

const TableSalesPanel: React.FC<TableSalesPanelProps> = ({ storeId, operatorName }) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [cartItems, setCartItems] = useState<TableCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerCount, setCustomerCount] = useState(1);
  const [paymentType, setPaymentType] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'voucher' | 'misto'>('dinheiro');
  const [changeAmount, setChangeAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'livre' | 'ocupada' | 'aguardando_conta' | 'limpeza'>('all');

  const tableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
  const salesTableName = storeId === 1 ? 'store1_table_sales' : 'store2_table_sales';
  const itemsTableName = storeId === 1 ? 'store1_table_sale_items' : 'store2_table_sale_items';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ocupada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'aguardando_conta':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'limpeza':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'livre':
        return 'Livre';
      case 'ocupada':
        return 'Ocupada';
      case 'aguardando_conta':
        return 'Aguardando Conta';
      case 'limpeza':
        return 'Limpeza';
      default:
        return status;
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          current_sale:${salesTableName}!${tableName.replace('tables', 'tables_current_sale_id_fkey')}(*)
        `)
        .eq('is_active', true)
        .order('number');

      if (error) throw error;
      setTables(data || []);
    } catch (err) {
      console.error(`Erro ao carregar mesas da Loja ${storeId}:`, err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mesas');
    } finally {
      setLoading(false);
    }
  };

  const openTable = async (table: RestaurantTable) => {
    try {
      // Criar nova venda para a mesa
      const { data: sale, error: saleError } = await supabase
        .from(salesTableName)
        .insert([{
          table_id: table.id,
          operator_name: operatorName || 'Operador',
          customer_name: '',
          customer_count: 1,
          subtotal: 0,
          discount_amount: 0,
          total_amount: 0,
          status: 'aberta',
          opened_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Atualizar status da mesa
      const { error: tableError } = await supabase
        .from(tableName)
        .update({
          status: 'ocupada',
          current_sale_id: sale.id
        })
        .eq('id', table.id);

      if (tableError) throw tableError;

      setSelectedTable({ ...table, status: 'ocupada', current_sale_id: sale.id });
      setShowSaleModal(true);
      fetchTables();
    } catch (err) {
      console.error('Erro ao abrir mesa:', err);
      alert('Erro ao abrir mesa');
    }
  };

  const closeTable = async (table: RestaurantTable) => {
    try {
      // Atualizar status da mesa
      const { error } = await supabase
        .from(tableName)
        .update({
          status: 'livre',
          current_sale_id: null
        })
        .eq('id', table.id);

      if (error) throw error;

      // Fechar venda se existir
      if (table.current_sale_id) {
        await supabase
          .from(salesTableName)
          .update({
            status: 'fechada',
            closed_at: new Date().toISOString()
          })
          .eq('id', table.current_sale_id);
      }

      fetchTables();
    } catch (err) {
      console.error('Erro ao fechar mesa:', err);
      alert('Erro ao fechar mesa');
    }
  };

  const addItemToCart = () => {
    const newItem: TableCartItem = {
      product_code: 'ITEM001',
      product_name: 'Açaí 500ml',
      quantity: 1,
      unit_price: 22.99,
      subtotal: 22.99
    };
    setCartItems(prev => [...prev, newItem]);
  };

  const removeItemFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromCart(index);
      return;
    }

    setCartItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          quantity,
          subtotal: (item.unit_price || 0) * quantity
        };
      }
      return item;
    }));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = searchTerm === '' || 
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.number.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    fetchTables();
  }, [storeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando mesas da Loja {storeId}...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            Vendas por Mesa - Loja {storeId}
          </h2>
          <p className="text-gray-600">Gerencie vendas presenciais por mesa</p>
        </div>
        <button
          onClick={() => setShowNewTableModal(true)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Mesa
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar mesa..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="lg:w-64">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Status</option>
              <option value="livre">Livre</option>
              <option value="ocupada">Ocupada</option>
              <option value="aguardando_conta">Aguardando Conta</option>
              <option value="limpeza">Limpeza</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTables.map((table) => (
          <div
            key={table.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all duration-200 hover:shadow-md ${
              table.status === 'livre' ? 'hover:border-green-300' : ''
            }`}
          >
            {/* Table Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 rounded-full p-2">
                  <Users size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Mesa {table.number}</h3>
                  <p className="text-sm text-gray-600">{table.name}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(table.status)}`}>
                {getStatusLabel(table.status)}
              </span>
            </div>

            {/* Table Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={16} />
                <span>Capacidade: {table.capacity} pessoas</span>
              </div>
              {table.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package size={16} />
                  <span>Local: {table.location}</span>
                </div>
              )}
            </div>

            {/* Current Sale Info */}
            {table.current_sale && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Venda #{table.current_sale.sale_number}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Cliente: {table.current_sale.customer_name || 'Não informado'}</p>
                  <p>Pessoas: {table.current_sale.customer_count}</p>
                  <p className="font-semibold text-green-600">
                    Total: {formatPrice(table.current_sale.total_amount)}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {table.status === 'livre' ? (
                <button
                  onClick={() => openTable(table)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Abrir Mesa
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setShowSaleModal(true);
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit3 size={16} />
                    Gerenciar
                  </button>
                  <button
                    onClick={() => closeTable(table)}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Nenhuma mesa encontrada' 
              : `Nenhuma mesa cadastrada na Loja ${storeId}`
            }
          </p>
        </div>
      )}

      {/* Sale Management Modal */}
      {showSaleModal && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Mesa {selectedTable.number} - {selectedTable.name}</h2>
                    <p className="text-indigo-100">Loja {storeId} - Gerenciar Venda</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedTable(null);
                    setCartItems([]);
                    setCustomerName('');
                    setCustomerCount(1);
                    setNotes('');
                  }}
                  className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Customer Info & Products */}
                <div className="space-y-6">
                  {/* Customer Information */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <User size={20} className="text-indigo-600" />
                      Informações do Cliente
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome do Cliente
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Nome do cliente (opcional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número de Pessoas
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setCustomerCount(Math.max(1, customerCount - 1))}
                            className="bg-gray-200 hover:bg-gray-300 rounded-full p-2 transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-xl font-semibold w-12 text-center">{customerCount}</span>
                          <button
                            onClick={() => setCustomerCount(customerCount + 1)}
                            className="bg-gray-200 hover:bg-gray-300 rounded-full p-2 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Products */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Package size={20} className="text-indigo-600" />
                      Adicionar Produtos
                    </h3>
                    <button
                      onClick={addItemToCart}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      Adicionar Item (Demo)
                    </button>
                  </div>
                </div>

                {/* Right Column - Cart & Payment */}
                <div className="space-y-6">
                  {/* Cart Items */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <ShoppingCart size={20} className="text-indigo-600" />
                      Itens da Venda ({cartItems.length})
                    </h3>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {cartItems.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart size={32} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500">Nenhum item adicionado</p>
                        </div>
                      ) : (
                        cartItems.map((item, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-800">{item.product_name}</h4>
                                <p className="text-sm text-gray-600">Código: {item.product_code}</p>
                              </div>
                              <button
                                onClick={() => removeItemFromCart(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                  className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="font-medium w-8 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                  className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">
                                  {formatPrice(item.unit_price || 0)} x {item.quantity}
                                </p>
                                <p className="font-bold text-indigo-600">
                                  {formatPrice(item.subtotal)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Payment Information */}
                  {cartItems.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <CreditCard size={20} className="text-indigo-600" />
                        Pagamento
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Forma de Pagamento
                          </label>
                          <select
                            value={paymentType}
                            onChange={(e) => setPaymentType(e.target.value as any)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="cartao_credito">Cartão de Crédito</option>
                            <option value="cartao_debito">Cartão de Débito</option>
                            <option value="voucher">Voucher</option>
                            <option value="misto">Pagamento Misto</option>
                          </select>
                        </div>

                        {paymentType === 'dinheiro' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Troco para:
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={changeAmount}
                              onChange={(e) => setChangeAmount(parseFloat(e.target.value) || 0)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Valor para troco"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observações
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            rows={3}
                            placeholder="Observações da venda..."
                          />
                        </div>

                        {/* Total */}
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex justify-between items-center text-xl font-bold">
                            <span className="text-gray-800">Total:</span>
                            <span className="text-green-600">{formatPrice(getCartTotal())}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedTable(null);
                    setCartItems([]);
                    setCustomerName('');
                    setCustomerCount(1);
                    setNotes('');
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                {cartItems.length > 0 && (
                  <button
                    onClick={() => {
                      // Implementar finalização da venda
                      alert('Funcionalidade de finalização será implementada');
                    }}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Save size={16} />
                    Finalizar Venda
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Table Modal */}
      {showNewTableModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Nova Mesa - Loja {storeId}</h2>
                <button
                  onClick={() => setShowNewTableModal(false)}
                  className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número da Mesa *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Mesa *
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Mesa da Janela"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    defaultValue="4"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Número de pessoas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localização (opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Área externa, Salão principal"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewTableModal(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // Implementar criação de mesa
                    alert('Funcionalidade de criação será implementada');
                    setShowNewTableModal(false);
                  }}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  Criar Mesa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo das Mesas - Loja {storeId}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {tables.filter(t => t.status === 'livre').length}
            </p>
            <p className="text-sm text-gray-600">Livres</p>
          </div>
          
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Users size={24} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {tables.filter(t => t.status === 'ocupada').length}
            </p>
            <p className="text-sm text-gray-600">Ocupadas</p>
          </div>
          
          <div className="text-center">
            <div className="bg-yellow-100 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Clock size={24} className="text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {tables.filter(t => t.status === 'aguardando_conta').length}
            </p>
            <p className="text-sm text-gray-600">Aguardando</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Package size={24} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {tables.filter(t => t.status === 'limpeza').length}
            </p>
            <p className="text-sm text-gray-600">Limpeza</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSalesPanel;