import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials in environment variables!");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Registers a new user.
 * Hashes the PIN using bcryptjs and inserts the user into the 'users' table.
 */
export async function registerUser(name, pin) {
  try {
    if (!name || !pin) {
      return { error: "Nombre y PIN son requeridos" };
    }

    // Verify if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("name", name)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingUser) {
      return { error: "El usuario ya existe" };
    }

    // Hash the PIN using bcryptjs
    const pin_hash = await bcrypt.hash(pin.toString(), 10);

    const { data, error } = await supabase
      .from("users")
      .insert([{ name, pin_hash }])
      .select()
      .single();

    if (error) throw error;

    return { success: true, user: { id: data.id, name: data.name } };
  } catch (err) {
    console.error("Error en registerUser:", err);
    return { error: err.message || "Error al registrar el usuario" };
  }
}

/**
 * Logins an existing user.
 * Compares the PIN hash with the stored hash using bcryptjs.
 */
export async function loginUser(name, pin) {
  try {
    if (!name || !pin) {
      return { error: "Nombre y PIN son requeridos" };
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("name", name)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return { error: "Usuario no encontrado" };
    }

    const valid = await bcrypt.compare(pin.toString(), user.pin_hash);
    if (!valid) {
      return { error: "PIN incorrecto" };
    }

    return { success: true, user: { id: user.id, name: user.name } };
  } catch (err) {
    console.error("Error en loginUser:", err);
    return { error: err.message || "Error al iniciar sesión" };
  }
}

/**
 * Saves match details in the 'matches' table.
 */
export async function saveMatch(matchData) {
  try {
    const { error } = await supabase
      .from("matches")
      .insert([matchData]);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error en saveMatch:", err);
    return { error: err.message || "Error al guardar la partida" };
  }
}

/**
 * Consults matches where the user participated as player1 or player2.
 * Includes the field 'word', ordered by 'created_at' descending (most recent first).
 */
export async function getHistoryForUser(user_id) {
  try {
    if (!user_id) return [];

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .or(`player1_id.eq.${user_id},player2_id.eq.${user_id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error en getHistoryForUser:", err);
    return [];
  }
}
