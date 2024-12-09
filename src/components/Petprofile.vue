<template>
  <div class="pet-management logcad-container">
    <h1 class="modal-title logcad-header">Gestão de Pets</h1>

    <!-- Lista de Pets -->
    <div v-for="pet in pets" :key="pet.id" class="pet-card logcad-container">
      <div class="pet-header">
        <h3>{{ pet.name }}</h3> <!-- Botões de editar e remover com ícones -->
        <div>
          <button @click="editPet(pet)" class="btn btn-info btn-sm">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button @click="removePet(pet.id)" class="btn btn-danger btn-sm">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </div>

      <p><strong>Espécie:</strong> {{ pet.species }}</p>
      <p><strong>Raça:</strong> {{ pet.breed }}</p>
      <p><strong>Idade:</strong> {{ pet.age }} anos</p>
      <p><strong>Sexo:</strong> {{ pet.sex }}</p>
      <p><strong>Peso:</strong> {{ pet.weight }} kg</p>
      <p><strong>Cor:</strong> {{ pet.color }}</p>
      <p><strong>Microchip:</strong> {{ pet.microchip || "Não informado" }}</p>
      <p><strong>Vacinas:</strong> {{ pet.vaccinations.length ? pet.vaccinations.join(', ') : "Nenhuma" }}</p>
      <p><strong>Condições Médicas:</strong> {{ pet.conditions || "Nenhuma" }}</p>
      <p><strong>Alergias:</strong> {{ pet.allergies || "Nenhuma" }}</p>



    </div>

    <!-- Botão para exibir o formulário de adicionar pet -->
    <button class="btn btn-success" @click="showPetForm()">
      <i class="bi bi-plus-circle-fill"></i> Adicionar Pet
    </button>
    <!-- Formulário para adicionar ou editar pet -->
    <form v-if="showPetInfoCard" @submit.prevent="isEditing ? updatePet() : addPet()" class="pet-form logcad-container">
      <h2>{{ isEditing ? "Editar Pet" : "Adicionar Novo Pet" }}</h2>

      <!-- Campos do formulário organizados em colunas -->
      <div class="row mb-2">
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Nome do Pet*</p>
          <input id="petName" v-model="newPet.name" type="text" required class="form-control logcad-input">
        </div>
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Espécie*</p>
          <select id="species" v-model="newPet.species" class="form-select logcad-input">
            <option value="cão">Cão</option>
            <option value="gato">Gato</option>
            <option value="pássaro">Pássaro</option>
          </select>
        </div>
      </div>

      <div class="row mb-2">
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Raça*</p>
          <input id="breed" v-model="newPet.breed" type="text" required class="form-control logcad-input">
        </div>
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Idade*</p>
          <input id="age" v-model.number="newPet.age" type="number" min="0" required class="form-control logcad-input">
        </div>
      </div>

      <div class="row mb-2">
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Sexo*</p>
          <select id="sex" v-model="newPet.sex" class="form-select logcad-input">
            <option value="macho">Macho</option>
            <option value="fêmea">Fêmea</option>
            <option value="desconhecido">Desconhecido</option>
          </select>
        </div>
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Peso (kg)</p>
          <input id="weight" v-model.number="newPet.weight" type="number" min="0" class="form-control logcad-input">
        </div>
      </div>

      <div class="row mb-2">
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Cor</p>
          <input id="color" v-model="newPet.color" type="text" class="form-control logcad-input">
        </div>
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Microchip</p>
          <input id="microchip" v-model="newPet.microchip" type="text" class="form-control logcad-input">
        </div>
      </div>

      <div class="row mb-2">
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Condições Médicas</p>
          <textarea id="conditions" v-model="newPet.conditions" class="form-control logcad-input"></textarea>
        </div>
        <div class="col-md-6">
          <p class="text-start txt_cadlog">Vacinas</p>
          <div v-for="(vaccine, index) in availableVaccines" :key="index" class="form-check">
            <input type="checkbox" class="form-check-input" :id="'vaccine' + index" v-model="newPet.vaccinations"
              :value="vaccine">
            <label class="form-check-label" :for="'vaccine' + index">{{ vaccine }}</label>
          </div>
        </div>
      </div>

    
      <!-- Botões de ação -->
      <button type="submit" class="btn btn-primary">
        <i class="bi bi-save2"></i> {{ isEditing ? "Atualizar Pet" : "Salvar Pet" }}
      </button>
      <button type="button" @click="cancelEdit" class="btn btn-secondary">
        <i class="bi bi-x-circle"></i> Cancelar
      </button>
    </form>
  </div>
</template>


<script>
import { ref, onMounted } from 'vue';
import { getAuth } from 'firebase/auth';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default {
  name: 'PetManagement',
  setup() {
    const auth = getAuth();
    const pets = ref([]);
    const newPet = ref({
      name: '',
      species: '',
      breed: '',
      age: 0,
      sex: '',
      weight: 0,
      color: '',
      microchip: '',
      vaccinations: [],
      conditions: '',
      allergies: '',
      ownerId: ''
    });
    const errors = ref({});
    const showPetInfoCard = ref(false);
    const isEditing = ref(false);
    const editingPetId = ref(null);
    const availableVaccines = [
      "Vacina Múltipla V8",
      "Vacina Múltipla V10",
      "Raiva",
      "Giardíase",
      "Tosse dos Canis",
      "Leishmaniose",
      "Tríplice Felina FVRCP",
      "Outras"
    ];
    const fetchPets = async (uid) => {
      const petsQuery = query(collection(db, "pets"), where("ownerId", "==", uid));
      const querySnapshot = await getDocs(petsQuery);
      pets.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    onMounted(async () => {
      const user = auth.currentUser;
      if (user) {
        await fetchPets(user.uid);
      } else {
        console.error("Usuário não autenticado ou indisponível");
      }
    });

    const addPet = async () => {
      if (!validatePet()) {
        alert("Verifique os campos e tente novamente.");
        return;
      }

      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          newPet.value.ownerName = `${userSnap.data().firstName} ${userSnap.data().lastName}`;
          newPet.value.ownerId = user.uid;
        }
      } else {
        console.error("Usuário não autenticado ou indisponível");
        return;
      }

      try {
        const docRef = await addDoc(collection(db, "pets"), { ...newPet.value });
        pets.value.push({ ...newPet.value, id: docRef.id });
        resetForm();
      } catch (error) {
        console.error("Erro ao adicionar pet:", error);
      }
    };

    const editPet = (pet) => {
      newPet.value = { ...pet };
      editingPetId.value = pet.id;
      isEditing.value = true;
      showPetInfoCard.value = true;
    };

    const updatePet = async () => {
      if (!validatePet()) {
        alert("Verifique os campos e tente novamente.");
        return;
      }

      const petRef = doc(db, "pets", editingPetId.value);
      try {
        await updateDoc(petRef, { ...newPet.value });
        const index = pets.value.findIndex(pet => pet.id === editingPetId.value);
        pets.value[index] = { ...newPet.value, id: editingPetId.value };
        resetForm();
      } catch (error) {
        console.error("Erro ao atualizar pet:", error);
      }
    };

    const removePet = async (petId) => {
      const petRef = doc(db, "pets", petId);
      try {
        await deleteDoc(petRef); // Remove o documento do Firestore
        pets.value = pets.value.filter(pet => pet.id !== petId); // Remove o pet da lista local
      } catch (error) {
        console.error("Erro ao remover pet:", error);
      }
    };

    const showPetForm = () => {
      resetForm();
      showPetInfoCard.value = true;
    };

    const cancelEdit = () => {
      resetForm();
    };

    const resetForm = () => {
      newPet.value = {
        name: '',
        species: '',
        breed: '',
        age: '',
        sex: '',
        weight: '',
        color: '',
        microchip: '',
        vaccinations: [],
        conditions: '',
        allergies: '',
        photo: null,
        ownerName: '',
        emergencyContact: '',
        ownerId: ''
      };
      isEditing.value = false;
      editingPetId.value = null;
      showPetInfoCard.value = false;
    };

    const validatePet = () => {
      errors.value = {};

      if (!newPet.value.name.trim()) errors.value.name = "Nome do pet é obrigatório.";
      if (!/^[a-zA-Z ]+$/.test(newPet.value.name)) errors.value.name = "Nome do pet deve conter apenas letras.";

      if (!newPet.value.breed.trim()) errors.value.breed = "Raça é obrigatória.";
      if (!/^[a-zA-Z ]+$/.test(newPet.value.breed)) errors.value.breed = "Raça deve conter apenas letras.";

      if (!newPet.value.age) errors.value.age = "Idade é obrigatória.";
      if (isNaN(newPet.value.age) || newPet.value.age < 0) errors.value.age = "Idade deve ser um número válido.";

      return Object.keys(errors.value).length === 0;
    };

    return {
      newPet,
      pets,
      addPet,
      updatePet,
      editPet,
      removePet,
      cancelEdit,
      showPetForm,
      errors,
      showPetInfoCard,
      isEditing,
      availableVaccines
    };
  }
};
</script>

<style scoped>
.logcad-container {
  background-color: hsl(0, 0%, 100%);
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
}

.pet-management.logcad-container {
  margin-top: 100%;
}

.pet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 10px; /* Espaço à direita para não colar nos botões */
}
.pet-header h3 {
  flex: 1; /* Ocupa o máximo de espaço possível */
  text-align: center; /* Centraliza o texto do título */
  margin-right: auto; /* Garante que o título fique centralizado */
  margin-left: 80px; /* Aumenta a margem esquerda para deslocar um pouco para a direita */

}

.pet-actions {
  display: flex;
  gap: 10px;
  /* Espaçamento entre os botões */
}

.pet-card {
  border: 1px solid #ccc;
  padding: 15px;
  margin: 15px 0;
  border-radius: 8px;
  background-color: #fff;

}
.pet-card p {
  margin: 5px 0;
}

.pet-card h3 {
  color: #007bff;
}

.btn-add-pet,
.btn-gradient {
  width: 100%;
  padding: 10px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 5px 0;
  background: linear-gradient(135deg, #4A7C59, #375A4C);
}

.btn-cancel,
.btn-remove {
  background-color: #dc3545;
}

.logcad-input {
  border-radius: 10px;
  padding: 0.8rem;
  font-size: 1rem;
}

.logcad-input:focus {
  outline: none;
  border-color: #88BDBC;
  /* Verde suave */
  box-shadow: 0 0 4px rgba(136, 189, 188, 0.4);
}

.btn btn-info btn-sm {
  background-color: #35dc6d;

}
</style>
